/**
 * Installation for a real client (SRS 6.4, AUTH-10). Creates the reference data and the first
 * Admin account, without any demo data. The Admin must change the password at first sign-in,
 * then adds the branches (BR-03), the staff, the companies and the trips.
 *
 *   npm run setup:install -w @travelos/api -- --office "اسم المكتب" --email admin@office.sy \
 *     --password "Initial-Pass-2027" --whatsapp 963944000000 [--name "اسم المدير"] [--currency SYP]
 *
 * Refuses to run on a database that already has data.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from '@travelos/shared';
import { PrismaClient } from '../src/generated/prisma/client';

loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });

const { values } = parseArgs({
  options: {
    office: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
    whatsapp: { type: 'string' },
    name: { type: 'string', default: 'مدير المكتب' },
    currency: { type: 'string', default: 'SYP' },
  },
});

const PASSWORD_RULE = /^(?=.*[A-Za-z؀-ۿ])(?=.*\d).{10,128}$/;

async function main() {
  const missing = (['office', 'email', 'password', 'whatsapp'] as const).filter((k) => !values[k]);
  if (missing.length) throw new Error(`Missing: ${missing.map((m) => `--${m}`).join(' ')}`);
  if (!PASSWORD_RULE.test(values.password!)) throw new Error('The password needs at least 10 characters with a letter and a digit');
  if (!/^\d{8,15}$/.test(values.whatsapp!.replace(/^\+/, ''))) throw new Error('--whatsapp: international number, digits only');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    if ((await prisma.siteSetting.count()) || (await prisma.user.count())) throw new Error('This database is already installed.');

    await prisma.$transaction(async (tx) => {
      await tx.permission.createMany({ data: ALL_PERMISSIONS.map((code) => ({ code, module: PERMISSIONS[code].module, description: PERMISSIONS[code].en })) });
      const perms = new Map((await tx.permission.findMany()).map((p) => [p.code, p.id]));
      const roleIds: Record<string, string> = {};
      for (const r of SYSTEM_ROLES) {
        const role = await tx.role.create({
          data: { code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, description: r.description, scope: r.scope, isSystem: true, permissions: { create: r.permissions.map((p) => ({ permissionId: perms.get(p)! })) } },
        });
        roleIds[r.code] = role.id;
      }

      await tx.currency.createMany({
        data: [
          { code: 'SYP', nameAr: 'ليرة سورية', nameEn: 'Syrian pound', symbol: 'ل.س', decimals: 0 },
          { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US dollar', symbol: '$', decimals: 2 },
          { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi riyal', symbol: 'ر.س', decimals: 2 },
        ],
      });

      // REF-05: Syria and its 14 governorates; other countries are added by the Admin.
      const sy = await tx.country.create({ data: { isoCode: 'SY', nameAr: 'سوريا', nameEn: 'Syria' } });
      await tx.city.createMany({
        data: [
          ['دمشق', 'Damascus'],
          ['ريف دمشق', 'Rif Dimashq'],
          ['حلب', 'Aleppo'],
          ['حمص', 'Homs'],
          ['حماة', 'Hama'],
          ['اللاذقية', 'Latakia'],
          ['طرطوس', 'Tartus'],
          ['إدلب', 'Idlib'],
          ['الرقة', 'Raqqa'],
          ['دير الزور', 'Deir ez-Zor'],
          ['الحسكة', 'Al-Hasakah'],
          ['درعا', 'Daraa'],
          ['السويداء', 'As-Suwayda'],
          ['القنيطرة', 'Quneitra'],
        ].map(([ar, en]) => ({ countryId: sy.id, nameAr: ar, nameEn: en, kind: 'GOVERNORATE' as const })),
      });

      // REF-07: the two categories named in the brief; the Admin adds more.
      await tx.tripCategory.createMany({ data: [{ nameAr: 'ثقافي', nameEn: 'Cultural' }, { nameAr: 'ديني', nameEn: 'Religious' }] });

      // SUP-01: the three core services
      await tx.service.createMany({
        data: [
          { code: 'HOTEL', kind: 'HOTEL', nameAr: 'فندق', nameEn: 'Hotel', isSystem: true },
          { code: 'TRANSPORT', kind: 'TRANSPORT', nameAr: 'نقل', nameEn: 'Transport', isSystem: true },
          { code: 'RESTAURANT', kind: 'RESTAURANT', nameAr: 'مطعم', nameEn: 'Restaurant', isSystem: true },
        ],
      });

      await tx.siteSetting.create({
        data: {
          id: 1,
          officeName: values.office!,
          whatsappNumber: values.whatsapp!.replace(/^\+/, ''),
          whatsappTemplate: 'مرحباً، أرغب بالحجز في: {title} ({code})\nالسعر المعلن: {price}\n{link}',
          defaultCurrencyCode: values.currency!,
        },
      });

      // AUTH-10: the first Admin, who must change the password at the first sign-in
      await tx.user.create({
        data: {
          fullName: values.name!,
          email: values.email!.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(values.password!, 12),
          mustChangePassword: true,
          roleId: roleIds.ADMIN,
        },
      });
      await tx.auditLog.create({ data: { action: 'system.installed', entityType: 'system', summary: `Installed for ${values.office}` } });
    });
    console.log(`Installed. Sign in as ${values.email} and change the password. Next: add a branch, then the staff.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
