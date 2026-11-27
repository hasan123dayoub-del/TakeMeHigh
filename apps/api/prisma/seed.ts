/**
 * TakeMeHigh demo data (fictional office "سما الشام للسياحة والسفر"). Run with `npm run db:seed`
 * (refuses if data exists) or `npm run db:reset`. Dates are relative to the day of seeding.
 *
 * It tells the story of the SRS: three integrated suppliers (hotel, transport, restaurant) synced
 * from the built-in sandbox, trips priced as cost + profit, the Damascus → Tartus → Arwad program,
 * an international Umrah program (flight, Saudi land transport, hotels) with visas, bundle and
 * discount offers, a full trip with a waiting list, a closed trip below its minimum, a draft, a
 * year of completed trips for the statistics, custom requests from the landing page and its content.
 */
import { config as loadEnv } from 'dotenv';
import { join, resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from '@travelos/shared';
import {
  PrismaClient,
  type ProfitMode,
  type TransportMode,
} from '../src/generated/prisma/client';
import { D, sellingPrice, toMoney } from '../src/common/utils/money';
import { encryptSecret } from '../src/common/utils/crypto';
import {
  defaultQuantity,
  lineCost,
  orderLines,
  programTotals,
  tripTotals,
  bundleTotals,
} from '../src/products/rules';
import { demoImage, type Theme } from './demo-art';

loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const DEMO_PASSWORD = 'TakeMeHigh@2026';
const API_BASE = (
  process.env.API_PUBLIC_URL ||
  `http://localhost:${process.env.API_PORT || 3001}`
).replace(/\/+$/, '');
const UPLOAD_ROOT = resolve(
  process.env.UPLOAD_DIR || join(__dirname, '../../../uploads'),
);

// deterministic pseudo-random so every reset tells the same story
let seed = 20261123;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
/** day offset + local hour (Syria is UTC+3) */
const at = (offset: number, hour = 9, minute = 0) =>
  new Date(
    today.getTime() +
      offset * 86_400_000 +
      (hour - 3) * 3_600_000 +
      minute * 60_000,
  );
const dateOnly = (offset: number) =>
  new Date(today.getTime() + offset * 86_400_000);

const FIRST_M = [
  'أحمد',
  'محمد',
  'خالد',
  'عمر',
  'يوسف',
  'هادي',
  'باسل',
  'سامر',
  'طارق',
  'كريم',
  'فادي',
  'مازن',
  'رامي',
  'وسيم',
  'زياد',
];
const FIRST_F = [
  'سارة',
  'ليلى',
  'رنا',
  'نور',
  'دانة',
  'ريم',
  'هبة',
  'جنى',
  'لمى',
  'مريم',
  'سلمى',
  'رهف',
  'تالا',
];
const LAST = [
  'المصري',
  'الحلبي',
  'الشامي',
  'درويش',
  'حمدان',
  'العبود',
  'قصاب',
  'منصور',
  'زين',
  'عيسى',
  'حجازي',
  'صباغ',
  'الخطيب',
  'النجار',
];

async function nextNumber(prefix: string, digits: number, when = new Date()) {
  const key = `${prefix}-${when.getUTCFullYear()}`;
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO number_sequences (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = number_sequences.value + 1 RETURNING value`;
  return `${prefix}-${when.getUTCFullYear()}-${String(rows[0].value).padStart(digits, '0')}`;
}

async function main() {
  if (await prisma.siteSetting.findUnique({ where: { id: 1 } })) {
    console.log(
      'Demo data already exists. Use `npm run db:reset` to rebuild it.',
    );
    return;
  }

  // ------------------------------------------------------------ access
  await prisma.permission.createMany({
    data: ALL_PERMISSIONS.map((code) => ({
      code,
      module: PERMISSIONS[code].module,
      description: PERMISSIONS[code].en,
    })),
  });
  const perms = new Map(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );
  const roles: Record<string, string> = {};
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.create({
      data: {
        code: r.code,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        description: r.description,
        scope: r.scope,
        isSystem: true,
        permissions: {
          create: r.permissions.map((p) => ({ permissionId: perms.get(p)! })),
        },
      },
    });
    roles[r.code] = role.id;
  }

  // ------------------------------------------------------------ reference data
  await prisma.currency.createMany({
    data: [
      {
        code: 'SYP',
        nameAr: 'ليرة سورية',
        nameEn: 'Syrian pound',
        symbol: 'ل.س',
        decimals: 0,
      },
      {
        code: 'USD',
        nameAr: 'دولار أمريكي',
        nameEn: 'US dollar',
        symbol: '$',
        decimals: 2,
      },
      {
        code: 'SAR',
        nameAr: 'ريال سعودي',
        nameEn: 'Saudi riyal',
        symbol: 'ر.س',
        decimals: 2,
      },
    ],
  });

  const countries: Record<string, string> = {};
  for (const [iso, ar, en, active] of [
    ['SY', 'سوريا', 'Syria', true],
    ['SA', 'السعودية', 'Saudi Arabia', true],
    ['LB', 'لبنان', 'Lebanon', true],
    ['JO', 'الأردن', 'Jordan', true],
    ['TR', 'تركيا', 'Turkey', true],
    ['AE', 'الإمارات', 'United Arab Emirates', true],
    ['EG', 'مصر', 'Egypt', true],
    ['IQ', 'العراق', 'Iraq', false],
  ] as const) {
    countries[iso] = (
      await prisma.country.create({
        data: { isoCode: iso, nameAr: ar, nameEn: en, isActive: active },
      })
    ).id;
  }

  const cities: Record<string, string> = {};
  const addCity = async (
    key: string,
    country: string,
    ar: string,
    en: string,
    kind: 'GOVERNORATE' | 'CITY' | 'TOURIST_SPOT' = 'CITY',
    isActive = true,
  ) => {
    cities[key] = (
      await prisma.city.create({
        data: {
          countryId: countries[country],
          nameAr: ar,
          nameEn: en,
          kind,
          isActive,
        },
      })
    ).id;
  };
  // REF-05: Syria and its 14 governorates
  for (const [key, ar, en] of [
    ['DAM', 'دمشق', 'Damascus'],
    ['RIF', 'ريف دمشق', 'Rif Dimashq'],
    ['ALP', 'حلب', 'Aleppo'],
    ['HMS', 'حمص', 'Homs'],
    ['HAM', 'حماة', 'Hama'],
    ['LTK', 'اللاذقية', 'Latakia'],
    ['TRT', 'طرطوس', 'Tartus'],
    ['IDL', 'إدلب', 'Idlib'],
    ['RAQ', 'الرقة', 'Raqqa'],
    ['DEZ', 'دير الزور', 'Deir ez-Zor'],
    ['HAS', 'الحسكة', 'Al-Hasakah'],
    ['DRA', 'درعا', 'Daraa'],
    ['SWD', 'السويداء', 'As-Suwayda'],
    ['QNT', 'القنيطرة', 'Quneitra'],
  ] as const)
    await addCity(key, 'SY', ar, en, 'GOVERNORATE');
  await addCity('ARW', 'SY', 'جزيرة أرواد', 'Arwad', 'TOURIST_SPOT');
  await addCity('BSR', 'SY', 'بصرى الشام', 'Bosra', 'TOURIST_SPOT');
  await addCity('PLM', 'SY', 'تدمر', 'Palmyra', 'TOURIST_SPOT');
  await addCity('WNS', 'SY', 'وادي النصارى', 'Wadi al-Nasara', 'TOURIST_SPOT');
  await addCity('MAL', 'SY', 'معلولا', 'Maaloula', 'TOURIST_SPOT');
  await addCity('KSB', 'SY', 'كسب', 'Kessab', 'TOURIST_SPOT');
  await addCity('JED', 'SA', 'جدة', 'Jeddah');
  await addCity('MKK', 'SA', 'مكة المكرمة', 'Mecca');
  await addCity('MED', 'SA', 'المدينة المنورة', 'Medina');
  await addCity('RUH', 'SA', 'الرياض', 'Riyadh');
  await addCity('BEY', 'LB', 'بيروت', 'Beirut');
  await addCity('AMM', 'JO', 'عمّان', 'Amman');
  await addCity('PET', 'JO', 'البتراء', 'Petra', 'TOURIST_SPOT');
  await addCity('IST', 'TR', 'إسطنبول', 'Istanbul');
  await addCity('DXB', 'AE', 'دبي', 'Dubai');
  await addCity('CAI', 'EG', 'القاهرة', 'Cairo');
  await addCity('BGD', 'IQ', 'بغداد', 'Baghdad', 'CITY', false);

  const categories: Record<string, string> = {};
  for (const [key, ar, en, active] of [
    ['CULTURAL', 'ثقافي', 'Cultural', true],
    ['RELIGIOUS', 'ديني', 'Religious', true],
    ['LEISURE', 'ترفيهي واستجمام', 'Leisure', true],
    ['NATURE', 'طبيعة ومغامرات', 'Nature & adventure', true],
    ['HISTORICAL', 'تاريخي وأثري', 'Historical', true],
    ['MEDICAL', 'سياحة علاجية', 'Medical tourism', false],
  ] as const)
    categories[key] = (
      await prisma.tripCategory.create({
        data: { nameAr: ar, nameEn: en, isActive: active },
      })
    ).id;

  // ------------------------------------------------------------ office
  const images: Record<string, string> = {};
  for (const [name, theme, s] of [
    ['latakia', 'sea', 1],
    ['arwad', 'island', 2],
    ['umrah', 'mosque', 3],
    ['aleppo', 'oldcity', 4],
    ['wadi', 'mountain', 5],
    ['bosra', 'ruins', 6],
    ['palmyra', 'desert', 7],
    ['hero', 'sea', 8],
    ['night', 'night', 9],
    ['bundle', 'sea', 10],
    ['achv1', 'oldcity', 11],
    ['achv2', 'mountain', 12],
    ['achv3', 'night', 13],
    ['achv4', 'island', 14],
    ['coast', 'island', 15],
  ] as [string, Theme, number][])
    images[name] = await demoImage(
      UPLOAD_ROOT,
      API_BASE,
      name,
      theme,
      s,
      // FILE_STORAGE=database (the live demo on Vercel): images live in the stored_files table
      process.env.FILE_STORAGE === 'database'
        ? (key, data) =>
            prisma.storedFile.upsert({
              where: { key },
              create: { key, mime: 'image/webp', data: new Uint8Array(data) },
              update: { data: new Uint8Array(data) },
            })
        : undefined,
    );

  await prisma.siteSetting.create({
    data: {
      id: 1,
      officeName: 'سما الشام للسياحة والسفر',
      officeNameEn: 'Sama Al-Sham Travel',
      tagline: 'رحلات منظّمة داخل سوريا وخارجها، بخدمات مختارة وأسعار واضحة',
      about:
        'مكتب سياحي بفرعين في دمشق وحلب، ينظّم الرحلات الداخلية والبرامج الدينية والخارجية منذ عام 2009، ويتعامل مع شبكة فنادق وشركات نقل ومطاعم موثوقة.',
      heroImageUrl: images.hero,
      whatsappNumber: '963944123456',
      whatsappTemplate:
        'مرحباً، أرغب بالحجز في: {title} ({code})\nالسعر المعلن: {price}\n{link}',
      phone: '+963 11 222 3344',
      email: 'info@sama-alsham.example',
      address: 'دمشق — شارع بغداد، بناء 12',
      defaultCurrencyCode: 'SYP',
      socialLinks: {
        facebook: 'https://facebook.com/',
        instagram: 'https://instagram.com/',
      },
    },
  });

  const branches: Record<string, string> = {};
  branches.DAM = (
    await prisma.branch.create({
      data: {
        name: 'فرع دمشق الرئيسي',
        cityId: cities.DAM,
        address: 'شارع بغداد، بناء 12',
        phone: '+963 11 222 3344',
        whatsapp: '963944123456',
        latitude: 33.5196,
        longitude: 36.2932,
        workingHours: 'السبت – الخميس، 9:00 – 18:00',
      },
    })
  ).id;
  branches.ALP = (
    await prisma.branch.create({
      data: {
        name: 'فرع حلب',
        cityId: cities.ALP,
        address: 'العزيزية، جانب فندق بارون',
        phone: '+963 21 444 5566',
        whatsapp: '963955654321',
        latitude: 36.2077,
        longitude: 37.1525,
        workingHours: 'السبت – الخميس، 9:00 – 17:00',
      },
    })
  ).id;

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users: Record<string, string> = {};
  for (const [key, name, email, role, branch] of [
    ['admin', 'حسان المدير', 'admin@takemehigh.local', 'ADMIN', null],
    [
      'mgrDam',
      'رامي قصاب',
      'manager.damascus@takemehigh.local',
      'BRANCH_MANAGER',
      'DAM',
    ],
    [
      'empDam',
      'لمى درويش',
      'employee.damascus@takemehigh.local',
      'EMPLOYEE',
      'DAM',
    ],
    [
      'empDam2',
      'وسيم منصور',
      'employee2.damascus@takemehigh.local',
      'EMPLOYEE',
      'DAM',
    ],
    [
      'guideDam',
      'مازن الخطيب',
      'guide.damascus@takemehigh.local',
      'TOUR_GUIDE',
      'DAM',
    ],
    [
      'mgrAlp',
      'سلمى الحلبي',
      'manager.aleppo@takemehigh.local',
      'BRANCH_MANAGER',
      'ALP',
    ],
    [
      'empAlp',
      'زياد حمدان',
      'employee.aleppo@takemehigh.local',
      'EMPLOYEE',
      'ALP',
    ],
    [
      'guideAlp',
      'تالا عيسى',
      'guide.aleppo@takemehigh.local',
      'TOUR_GUIDE',
      'ALP',
    ],
  ] as const) {
    users[key] = (
      await prisma.user.create({
        data: {
          fullName: name,
          email,
          phone: `+9639${Math.floor(10000000 + rnd() * 89999999)}`,
          passwordHash: hash,
          roleId: roles[role],
          branchId: branch ? branches[branch] : null,
          guideProfile:
            role === 'TOUR_GUIDE'
              ? {
                  create: {
                    languages: 'العربية، الإنكليزية',
                    licenseNo: `GD-${Math.floor(1000 + rnd() * 8999)}`,
                    bio: 'دليل معتمد من وزارة السياحة.',
                  },
                }
              : undefined,
        },
      })
    ).id;
  }

  // ------------------------------------------------------------ services, companies, items
  const services: Record<string, string> = {};
  for (const [code, kind, ar, en] of [
    ['HOTEL', 'HOTEL', 'فندق', 'Hotel'],
    ['TRANSPORT', 'TRANSPORT', 'نقل', 'Transport'],
    ['RESTAURANT', 'RESTAURANT', 'مطعم', 'Restaurant'],
  ] as const)
    services[kind] = (
      await prisma.service.create({
        data: { code, kind, nameAr: ar, nameEn: en, isSystem: true },
      })
    ).id;

  // PRC-02: default profit per service, plus one company-specific rule
  const rules: {
    serviceId: string;
    companyId: string | null;
    mode: ProfitMode;
    value: string;
  }[] = [
    {
      serviceId: services.HOTEL,
      companyId: null,
      mode: 'PERCENT',
      value: '20',
    },
    {
      serviceId: services.TRANSPORT,
      companyId: null,
      mode: 'PERCENT',
      value: '15',
    },
    {
      serviceId: services.RESTAURANT,
      companyId: null,
      mode: 'PERCENT',
      value: '25',
    },
  ];
  const companies: Record<
    string,
    { id: string; kind: 'HOTEL' | 'TRANSPORT' | 'RESTAURANT' }
  > = {};
  const addCompany = async (
    key: string,
    kind: 'HOTEL' | 'TRANSPORT' | 'RESTAURANT',
    name: string,
    country: string,
    city: string | null,
    extra: {
      transportMode?: TransportMode;
      rating?: number;
      contactName?: string;
      phone?: string;
      description?: string;
    } = {},
  ) => {
    const c = await prisma.company.create({
      data: {
        serviceId: services[kind],
        countryId: countries[country],
        cityId: city ? cities[city] : null,
        name,
        ...extra,
      },
    });
    companies[key] = { id: c.id, kind };
    return c.id;
  };
  await addCompany('LAMIRA', 'HOTEL', 'فنادق لاميرا', 'SY', 'DAM', {
    rating: 4,
    contactName: 'قسم الحجوزات',
    phone: '+963 11 333 0000',
    description:
      'سلسلة فنادق في دمشق وحلب واللاذقية وطرطوس — متكاملة مع النظام.',
  });
  await addCompany('AMIR', 'TRANSPORT', 'الأمير للنقل السياحي', 'SY', 'DAM', {
    transportMode: 'LAND',
    contactName: 'مكتب الحركة',
    phone: '+963 11 444 0000',
    description: 'بولمانات VIP بين المحافظات — متكاملة مع النظام.',
  });
  await addCompany('SHATI', 'RESTAURANT', 'مطاعم الشاطئ', 'SY', 'LTK', {
    contactName: 'الإدارة',
    phone: '+963 41 555 0000',
    description: 'باقات وجبات للمجموعات — متكاملة مع النظام.',
  });
  await addCompany('ARWADSEA', 'TRANSPORT', 'عبّارات أرواد', 'SY', 'TRT', {
    transportMode: 'SEA',
    phone: '+963 43 222 000',
  });
  await addCompany(
    'ARWADFOOD',
    'RESTAURANT',
    'مطعم أرواد البحري',
    'SY',
    'ARW',
    { phone: '+963 43 333 000' },
  );
  await addCompany('WADIBUS', 'TRANSPORT', 'نقل الوادي', 'SY', 'HMS', {
    transportMode: 'LAND',
  });
  await addCompany('WADIHOTEL', 'HOTEL', 'فندق الوادي الأخضر', 'SY', 'WNS', {
    rating: 3,
  });
  await addCompany('WADIFOOD', 'RESTAURANT', 'مطعم القلعة', 'SY', 'WNS');
  await addCompany('SHAMAIR', 'TRANSPORT', 'أجنحة الشام للطيران', 'SY', 'DAM', {
    transportMode: 'AIR',
    contactName: 'مبيعات المجموعات',
    phone: '+963 11 999 0000',
  });
  await addCompany('HARAMAIN', 'TRANSPORT', 'نقل الحرمين', 'SA', 'JED', {
    transportMode: 'LAND',
  });
  await addCompany('IMAN', 'HOTEL', 'فندق الإيمان مكة', 'SA', 'MKK', {
    rating: 4,
  });
  await addCompany('NOOR', 'HOTEL', 'فندق النور المدينة', 'SA', 'MED', {
    rating: 4,
  });
  await addCompany('HIJAZ', 'RESTAURANT', 'مطاعم الحجاز', 'SA', 'MKK');
  rules.push({
    serviceId: services.TRANSPORT,
    companyId: companies.SHAMAIR.id,
    mode: 'PERCENT',
    value: '10',
  });
  for (const r of rules)
    await prisma.profitRule.create({ data: { ...r, value: toMoney(r.value) } });

  const items: Record<
    string,
    {
      id: string;
      cost: string;
      kind: string;
      companyId: string;
      mode: TransportMode | null;
      currency: string;
    }
  > = {};
  const addItem = async (
    key: string,
    company: string,
    name: string,
    cost: number,
    currency: string,
    to: string | null,
    from: string | null = null,
    integration?: string,
  ) => {
    const c = companies[company];
    const companyRow = await prisma.company.findUniqueOrThrow({
      where: { id: c.id },
    });
    const i = await prisma.companyItem.create({
      data: {
        companyId: c.id,
        name,
        fromCityId: from ? cities[from] : null,
        toCityId: to ? cities[to] : null,
        costPerPerson: toMoney(cost),
        currencyCode: currency,
        source: integration ? 'INTEGRATION' : 'MANUAL',
        externalRef: integration ?? null,
        lastSyncedAt: integration ? new Date() : null,
        available: integration ? true : null,
      },
    });
    items[key] = {
      id: i.id,
      cost: toMoney(cost),
      kind: c.kind,
      companyId: c.id,
      mode: companyRow.transportMode,
      currency,
    };
  };
  // integration items (same references and base prices as the sandbox supplier)
  await addItem(
    'H_LTK',
    'LAMIRA',
    'فندق لاميرا اللاذقية — غرفة مزدوجة (للشخص/ليلة)',
    450000,
    'SYP',
    'LTK',
    null,
    'H-LTK-STD',
  );
  await addItem(
    'H_LTK_SEA',
    'LAMIRA',
    'فندق لاميرا اللاذقية — إطلالة بحرية (للشخص/ليلة)',
    620000,
    'SYP',
    'LTK',
    null,
    'H-LTK-SEA',
  );
  await addItem(
    'H_TRT',
    'LAMIRA',
    'فندق لاميرا طرطوس — غرفة مزدوجة (للشخص/ليلة)',
    380000,
    'SYP',
    'TRT',
    null,
    'H-TRT-STD',
  );
  await addItem(
    'H_ALP',
    'LAMIRA',
    'فندق لاميرا حلب — غرفة مزدوجة (للشخص/ليلة)',
    410000,
    'SYP',
    'ALP',
    null,
    'H-ALP-STD',
  );
  await addItem(
    'H_DAM',
    'LAMIRA',
    'فندق لاميرا دمشق — غرفة مزدوجة (للشخص/ليلة)',
    520000,
    'SYP',
    'DAM',
    null,
    'H-DAM-STD',
  );
  await addItem(
    'T_DAM_LTK',
    'AMIR',
    'دمشق ← اللاذقية — بولمان VIP',
    200000,
    'SYP',
    'LTK',
    'DAM',
    'T-DAM-LTK-BUS',
  );
  await addItem(
    'T_LTK_DAM',
    'AMIR',
    'اللاذقية ← دمشق — بولمان VIP',
    200000,
    'SYP',
    'DAM',
    'LTK',
    'T-LTK-DAM-BUS',
  );
  await addItem(
    'T_DAM_TRT',
    'AMIR',
    'دمشق ← طرطوس — بولمان',
    170000,
    'SYP',
    'TRT',
    'DAM',
    'T-DAM-TRT-BUS',
  );
  await addItem(
    'T_TRT_DAM',
    'AMIR',
    'طرطوس ← دمشق — بولمان',
    170000,
    'SYP',
    'DAM',
    'TRT',
    'T-TRT-DAM-BUS',
  );
  await addItem(
    'T_DAM_ALP',
    'AMIR',
    'دمشق ← حلب — بولمان',
    180000,
    'SYP',
    'ALP',
    'DAM',
    'T-DAM-ALP-BUS',
  );
  await addItem(
    'T_ALP_DAM',
    'AMIR',
    'حلب ← دمشق — بولمان',
    180000,
    'SYP',
    'DAM',
    'ALP',
    'T-ALP-DAM-BUS',
  );
  await addItem(
    'R_LTK',
    'SHATI',
    'مطعم الشاطئ اللاذقية — باقة 3 وجبات (للشخص/يوم)',
    150000,
    'SYP',
    'LTK',
    null,
    'R-LTK-FULL',
  );
  await addItem(
    'R_ALP',
    'SHATI',
    'مطعم الشاطئ حلب — باقة 3 وجبات (للشخص/يوم)',
    130000,
    'SYP',
    'ALP',
    null,
    'R-ALP-FULL',
  );
  await addItem(
    'R_DAM',
    'SHATI',
    'مطعم الشاطئ دمشق — غداء (للشخص)',
    90000,
    'SYP',
    'DAM',
    null,
    'R-DAM-LUNCH',
  );
  // manual items
  await addItem(
    'S_TRT_ARW',
    'ARWADSEA',
    'طرطوس ← أرواد — عبّارة',
    25000,
    'SYP',
    'ARW',
    'TRT',
  );
  await addItem(
    'S_ARW_TRT',
    'ARWADSEA',
    'أرواد ← طرطوس — عبّارة',
    25000,
    'SYP',
    'TRT',
    'ARW',
  );
  await addItem(
    'R_ARW',
    'ARWADFOOD',
    'غداء سمك بحري (للشخص)',
    120000,
    'SYP',
    'ARW',
  );
  await addItem(
    'T_DAM_WNS',
    'WADIBUS',
    'دمشق ← وادي النصارى — حافلة',
    150000,
    'SYP',
    'WNS',
    'DAM',
  );
  await addItem(
    'T_WNS_DAM',
    'WADIBUS',
    'وادي النصارى ← دمشق — حافلة',
    150000,
    'SYP',
    'DAM',
    'WNS',
  );
  await addItem(
    'T_DAM_BSR',
    'WADIBUS',
    'دمشق ← بصرى — حافلة',
    90000,
    'SYP',
    'BSR',
    'DAM',
  );
  await addItem(
    'T_BSR_DAM',
    'WADIBUS',
    'بصرى ← دمشق — حافلة',
    90000,
    'SYP',
    'DAM',
    'BSR',
  );
  await addItem(
    'T_DAM_PLM',
    'WADIBUS',
    'دمشق ← تدمر — حافلة',
    160000,
    'SYP',
    'PLM',
    'DAM',
  );
  await addItem(
    'H_WNS',
    'WADIHOTEL',
    'غرفة مزدوجة (للشخص/ليلة)',
    300000,
    'SYP',
    'WNS',
  );
  await addItem('R_WNS', 'WADIFOOD', 'عشاء جبلي (للشخص)', 100000, 'SYP', 'WNS');
  await addItem(
    'R_BSR',
    'WADIFOOD',
    'غداء في بصرى (للشخص)',
    80000,
    'SYP',
    'BSR',
  );
  await addItem(
    'A_DAM_JED',
    'SHAMAIR',
    'دمشق ← جدة — درجة سياحية',
    350,
    'USD',
    'JED',
    'DAM',
  );
  await addItem(
    'A_JED_DAM',
    'SHAMAIR',
    'جدة ← دمشق — درجة سياحية',
    350,
    'USD',
    'DAM',
    'JED',
  );
  await addItem(
    'L_JED_MKK',
    'HARAMAIN',
    'جدة ← مكة المكرمة — حافلة',
    25,
    'USD',
    'MKK',
    'JED',
  );
  await addItem(
    'L_MKK_MED',
    'HARAMAIN',
    'مكة ← المدينة المنورة — حافلة',
    30,
    'USD',
    'MED',
    'MKK',
  );
  await addItem(
    'L_MED_JED',
    'HARAMAIN',
    'المدينة ← جدة — حافلة',
    30,
    'USD',
    'JED',
    'MED',
  );
  await addItem(
    'H_MKK',
    'IMAN',
    'غرفة رباعية قرب الحرم (للشخص/ليلة)',
    60,
    'USD',
    'MKK',
  );
  await addItem(
    'H_MED',
    'NOOR',
    'غرفة رباعية قرب المسجد النبوي (للشخص/ليلة)',
    50,
    'USD',
    'MED',
  );
  await addItem(
    'R_MKK',
    'HIJAZ',
    'إقامة كاملة — 3 وجبات (للشخص/يوم)',
    20,
    'USD',
    'MKK',
  );
  await addItem(
    'R_MED',
    'HIJAZ',
    'إقامة كاملة — 3 وجبات (للشخص/يوم)',
    18,
    'USD',
    'MED',
  );
  await addItem('R_JED', 'HIJAZ', 'غداء في جدة (للشخص)', 15, 'USD', 'JED');

  // INT-01..05: the three integrated suppliers point at the built-in sandbox
  for (const [company, kind, adapter] of [
    ['LAMIRA', 'hotel', 'hotel-rest-v1'],
    ['AMIR', 'transport', 'transport-rest-v1'],
    ['SHATI', 'restaurant', 'restaurant-rest-v1'],
  ] as const) {
    const conn = await prisma.integrationConnection.create({
      data: {
        companyId: companies[company].id,
        adapterKey: adapter,
        baseUrl: `${API_BASE}/api/sandbox/suppliers/${kind}`,
        credentialsEncrypted: encryptSecret(
          JSON.stringify({
            apiKey: process.env.SANDBOX_SUPPLIER_KEY || 'sandbox-demo-key',
          }),
        ),
        status: 'ACTIVE',
        lastSyncAt: new Date(),
        lastSuccessAt: new Date(),
      },
    });
    for (let d = 3; d >= 0; d--)
      await prisma.integrationSyncLog.create({
        data: {
          connectionId: conn.id,
          trigger: d === 0 ? 'MANUAL' : 'SCHEDULED',
          result: 'SUCCESS',
          itemsUpdated: kind === 'transport' ? 6 : kind === 'hotel' ? 5 : 3,
          costChanges: d === 2 ? 1 : 0,
          startedAt: at(-d, 3),
          finishedAt: at(-d, 3, 1),
        },
      });
  }

  const ruleFor = (serviceId: string, companyId: string) =>
    rules.find((r) => r.serviceId === serviceId && r.companyId === companyId) ??
    rules.find((r) => r.serviceId === serviceId && r.companyId === null)!;

  // ------------------------------------------------------------ trips
  type LineSpec = [itemKey: string, start: Date, end: Date, quantity?: number];
  interface TripSpec {
    title: string;
    description: string;
    category: string;
    branch: string | null;
    origin: string;
    destination: string;
    start: Date;
    end: Date;
    deadline: Date;
    min: number;
    max: number;
    currency: string;
    status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'CONFIRMED' | 'COMPLETED';
    isPublic: boolean;
    cover?: string;
    lines: LineSpec[];
    terms?: string;
    closedAt?: Date;
    createdAt?: Date;
  }
  const tripIds: Record<string, string> = {};
  const tripMeta: Record<
    string,
    {
      price: string;
      cost: string;
      currency: string;
      max: number;
      branch: string | null;
      start: Date;
      end: Date;
    }
  > = {};
  const createTrip = async (key: string, s: TripSpec) => {
    const lines = orderLines(
      s.lines.map(([k, start, end, qty]) => {
        const it = items[k];
        const quantity =
          it.kind === 'TRANSPORT'
            ? 1
            : (qty ?? defaultQuantity(it.kind, start, end));
        const cost = lineCost(it.cost, quantity);
        const rule = ruleFor(services[it.kind], it.companyId);
        return {
          k,
          it,
          startsAt: start,
          endsAt: end,
          quantity,
          cost,
          rule,
          sellingPrice: sellingPrice(cost, rule.mode, rule.value),
          costSnapshot: cost,
        };
      }),
    );
    const totals = tripTotals(lines);
    // TRP-02: international as soon as the origin or the destination is abroad
    const ends = await prisma.city.findMany({
      where: { id: { in: [cities[s.origin], cities[s.destination]] } },
      include: { country: true },
    });
    const destCountry = ends.every((c) => c.country.isoCode === 'SY')
      ? 'SY'
      : 'XX';
    const trip = await prisma.trip.create({
      data: {
        code: await nextNumber('TR', 4, s.createdAt ?? new Date()),
        title: s.title,
        description: s.description,
        categoryId: categories[s.category],
        branchId: s.branch ? branches[s.branch] : null,
        originCityId: cities[s.origin],
        destinationCityId: cities[s.destination],
        scope: destCountry === 'SY' ? 'DOMESTIC' : 'INTERNATIONAL',
        startsAt: s.start,
        endsAt: s.end,
        registrationDeadline: s.deadline,
        minPassengers: s.min,
        maxPassengers: s.max,
        currencyCode: s.currency,
        status: s.status,
        isPublic: s.isPublic,
        coverImageUrl: s.cover,
        terms:
          s.terms ??
          'يشمل السعر الخدمات المذكورة فقط. يُرجى إحضار الوثيقة الشخصية الأصلية يوم الانطلاق. الإلغاء قبل 7 أيام باسترجاع 50% من المدفوع.',
        createdById: users.admin,
        createdAt: s.createdAt,
        ...totals,
        ...(s.status === 'CLOSED' ||
        s.status === 'CONFIRMED' ||
        s.status === 'COMPLETED'
          ? {
              closedAt: s.closedAt ?? s.deadline,
              closureReason: 'DEADLINE' as const,
            }
          : {}),
        lines: {
          create: lines.map((l, i) => ({
            companyItemId: l.it.id,
            serviceId: services[l.it.kind],
            transportMode: l.it.mode,
            sequenceNo: i + 1,
            startsAt: l.startsAt,
            endsAt: l.endsAt,
            unitCost: l.it.cost,
            quantity: l.quantity,
            costSnapshot: l.cost.toFixed(2),
            profitMode: l.rule.mode,
            profitValue: toMoney(l.rule.value),
            sellingPrice: l.sellingPrice.toFixed(2),
          })),
        },
      },
    });
    // copy the route cities from the items
    const created = await prisma.tripServiceLine.findMany({
      where: { tripId: trip.id },
      include: { item: true },
    });
    for (const l of created)
      await prisma.tripServiceLine.update({
        where: { id: l.id },
        data: { fromCityId: l.item.fromCityId, toCityId: l.item.toCityId },
      });
    tripIds[key] = trip.id;
    tripMeta[key] = {
      price: totals.pricePerPerson,
      cost: totals.costPerPerson,
      currency: s.currency,
      max: s.max,
      branch: s.branch,
      start: s.start,
      end: s.end,
    };
    return trip;
  };

  // A — the flagship domestic trip (the coach example: 200,000 net + 15% = 230,000)
  await createTrip('LTK', {
    title: 'استجمام في اللاذقية — 4 أيام',
    description:
      'أربعة أيام على شاطئ اللاذقية: إقامة في فندق لاميرا، باقة وجبات كاملة، وجولة في الكورنيش الجنوبي وقلعة صلاح الدين.',
    category: 'LEISURE',
    branch: null,
    origin: 'DAM',
    destination: 'LTK',
    start: at(12, 8),
    end: at(15, 18),
    deadline: at(9, 23, 59),
    min: 20,
    max: 45,
    currency: 'SYP',
    status: 'OPEN',
    isPublic: true,
    cover: images.latakia,
    lines: [
      ['T_DAM_LTK', at(12, 8), at(12, 12, 30)],
      ['R_LTK', at(12, 13), at(15, 12)],
      ['H_LTK', at(12, 14), at(15, 11)],
      ['T_LTK_DAM', at(15, 13), at(15, 17, 30)],
    ],
  });
  await prisma.tripPickupPoint.create({
    data: {
      tripId: tripIds.LTK,
      cityId: cities.HMS,
      pickupTime: '09:30',
      surcharge: toMoney(25000),
      notes: 'أمام كراج حمص الجديد',
    },
  });
  await prisma.tripGuide.create({
    data: { tripId: tripIds.LTK, userId: users.guideDam },
  });

  // B — Aleppo branch, fully booked with a waiting list
  await createTrip('ALP', {
    title: 'حلب القديمة وقلعتها',
    description:
      'جولة في أسواق حلب القديمة والقلعة والجامع الأموي، مع إقامة ليلتين وباقة وجبات.',
    category: 'HISTORICAL',
    branch: 'ALP',
    origin: 'DAM',
    destination: 'ALP',
    start: at(20, 7),
    end: at(22, 20),
    deadline: at(17, 23, 59),
    min: 15,
    max: 30,
    currency: 'SYP',
    status: 'OPEN',
    isPublic: true,
    cover: images.aleppo,
    lines: [
      ['T_DAM_ALP', at(20, 7), at(20, 12)],
      ['H_ALP', at(20, 13), at(22, 11)],
      ['R_ALP', at(20, 13), at(22, 14)],
      ['T_ALP_DAM', at(22, 15), at(22, 20)],
    ],
  });
  await prisma.tripGuide.create({
    data: { tripId: tripIds.ALP, userId: users.guideAlp },
  });

  // C — registration closed below the minimum: waiting for the Admin's decision (CLS-05)
  await createTrip('WNS', {
    title: 'وادي النصارى وقلعة الحصن',
    description: 'يومان في الطبيعة: قلعة الحصن، دير مار جرجس، وعشاء جبلي.',
    category: 'NATURE',
    branch: 'DAM',
    origin: 'DAM',
    destination: 'WNS',
    start: at(4, 8),
    end: at(5, 19),
    deadline: at(-1, 23, 59),
    min: 15,
    max: 25,
    currency: 'SYP',
    status: 'CLOSED',
    isPublic: true,
    cover: images.wadi,
    lines: [
      ['T_DAM_WNS', at(4, 8), at(4, 11)],
      ['H_WNS', at(4, 12), at(5, 10)],
      ['R_WNS', at(4, 19), at(4, 21)],
      ['T_WNS_DAM', at(5, 16), at(5, 19)],
    ],
  });

  // D — completed with every booking paid: realized profit
  await createTrip('BSR', {
    title: 'بصرى الشام — يوم واحد',
    description: 'المسرح الروماني والقلعة في بصرى مع غداء محلي.',
    category: 'HISTORICAL',
    branch: 'DAM',
    origin: 'DAM',
    destination: 'BSR',
    start: at(-12, 8),
    end: at(-12, 19),
    deadline: at(-15, 23, 59),
    min: 10,
    max: 40,
    currency: 'SYP',
    status: 'COMPLETED',
    isPublic: false,
    cover: images.bosra,
    createdAt: at(-30, 10),
    lines: [
      ['T_DAM_BSR', at(-12, 8), at(-12, 10)],
      ['R_BSR', at(-12, 13), at(-12, 14)],
      ['T_BSR_DAM', at(-12, 17), at(-12, 19)],
    ],
  });

  // E — a draft still being built (one service only: cannot be published yet, BR-04)
  await createTrip('PLM', {
    title: 'تدمر — لؤلؤة البادية',
    description: 'مسودة قيد الإعداد.',
    category: 'HISTORICAL',
    branch: null,
    origin: 'DAM',
    destination: 'PLM',
    start: at(35, 7),
    end: at(36, 20),
    deadline: at(30, 23, 59),
    min: 15,
    max: 40,
    currency: 'SYP',
    status: 'DRAFT',
    isPublic: false,
    cover: images.palmyra,
    lines: [['T_DAM_PLM', at(35, 7), at(35, 11)]],
  });

  // Program 1 — Damascus → Tartus (land), Tartus → Arwad (sea) and back
  await createTrip('P1A', {
    title: 'دمشق ← طرطوس',
    description:
      'المرحلة الأولى من برنامج الساحل: الانتقال إلى طرطوس والمبيت فيها.',
    category: 'CULTURAL',
    branch: 'DAM',
    origin: 'DAM',
    destination: 'TRT',
    start: at(25, 8),
    end: at(26, 9),
    deadline: at(22, 23, 59),
    min: 10,
    max: 40,
    currency: 'SYP',
    status: 'OPEN',
    isPublic: false,
    cover: images.coast,
    lines: [
      ['T_DAM_TRT', at(25, 8), at(25, 12)],
      ['H_TRT', at(25, 13), at(26, 9)],
    ],
  });
  await createTrip('P1B', {
    title: 'طرطوس ← جزيرة أرواد',
    description:
      'المرحلة الثانية: عبّارة إلى أرواد، غداء سمك، ثم العودة إلى دمشق.',
    category: 'CULTURAL',
    branch: 'DAM',
    origin: 'TRT',
    destination: 'ARW',
    start: at(26, 10),
    end: at(26, 21),
    deadline: at(22, 23, 59),
    min: 10,
    max: 40,
    currency: 'SYP',
    status: 'OPEN',
    isPublic: false,
    cover: images.arwad,
    lines: [
      ['S_TRT_ARW', at(26, 10), at(26, 10, 30)],
      ['R_ARW', at(26, 12), at(26, 14)],
      ['S_ARW_TRT', at(26, 16), at(26, 16, 30)],
      ['T_TRT_DAM', at(26, 17), at(26, 21)],
    ],
  });
  await prisma.tripGuide.create({
    data: { tripId: tripIds.P1B, userId: users.guideDam },
  });

  // Program 2 — Umrah: Damascus → Jeddah by air, land transport between Saudi cities, air back
  await createTrip('U1', {
    title: 'دمشق ← مكة المكرمة',
    description: 'الطيران إلى جدة، الانتقال إلى مكة، وأربع ليال قرب الحرم.',
    category: 'RELIGIOUS',
    branch: null,
    origin: 'DAM',
    destination: 'MKK',
    start: at(40, 6),
    end: at(44, 9),
    deadline: at(28, 23, 59),
    min: 20,
    max: 50,
    currency: 'USD',
    status: 'OPEN',
    isPublic: false,
    cover: images.umrah,
    lines: [
      ['A_DAM_JED', at(40, 6), at(40, 9)],
      ['L_JED_MKK', at(40, 10), at(40, 11, 30)],
      ['H_MKK', at(40, 13), at(44, 8)],
      ['R_MKK', at(40, 13), at(43, 22)],
    ],
  });
  await createTrip('U2', {
    title: 'مكة المكرمة ← المدينة المنورة',
    description: 'الانتقال برّاً إلى المدينة وثلاث ليال قرب المسجد النبوي.',
    category: 'RELIGIOUS',
    branch: null,
    origin: 'MKK',
    destination: 'MED',
    start: at(44, 9),
    end: at(47, 7),
    deadline: at(28, 23, 59),
    min: 20,
    max: 50,
    currency: 'USD',
    status: 'OPEN',
    isPublic: false,
    cover: images.umrah,
    lines: [
      ['L_MKK_MED', at(44, 9), at(44, 14)],
      ['H_MED', at(44, 15), at(47, 7)],
      ['R_MED', at(44, 15), at(46, 22)],
    ],
  });
  await createTrip('U3', {
    title: 'المدينة المنورة ← دمشق',
    description: 'الانتقال إلى جدة، غداء، والعودة جواً إلى دمشق.',
    category: 'RELIGIOUS',
    branch: null,
    origin: 'MED',
    destination: 'DAM',
    start: at(47, 8),
    end: at(47, 21),
    deadline: at(28, 23, 59),
    min: 20,
    max: 50,
    currency: 'USD',
    status: 'OPEN',
    isPublic: false,
    cover: images.umrah,
    lines: [
      ['L_MED_JED', at(47, 8), at(47, 13)],
      ['R_JED', at(47, 14), at(47, 15)],
      ['A_JED_DAM', at(47, 18), at(47, 21)],
    ],
  });

  const programIds: Record<string, string> = {};
  const createProgram = async (
    key: string,
    legs: string[],
    data: {
      title: string;
      description: string;
      category: string;
      branch: string | null;
      deadline: Date;
      min: number;
      max: number;
      cover: string;
      isPublic: boolean;
    },
  ) => {
    const legTrips = await prisma.trip.findMany({
      where: { id: { in: legs.map((l) => tripIds[l]) } },
    });
    const ordered = legs.map((l) => legTrips.find((t) => t.id === tripIds[l])!);
    const p = await prisma.program.create({
      data: {
        code: await nextNumber('PG', 4),
        title: data.title,
        description: data.description,
        categoryId: categories[data.category],
        branchId: data.branch ? branches[data.branch] : null,
        scope: ordered.some((t) => t.scope === 'INTERNATIONAL')
          ? 'INTERNATIONAL'
          : 'DOMESTIC',
        registrationDeadline: data.deadline,
        minPassengers: data.min,
        maxPassengers: data.max,
        currencyCode: ordered[0].currencyCode,
        status: 'OPEN',
        isPublic: data.isPublic,
        coverImageUrl: data.cover,
        terms:
          'السعر يشمل جميع رحلات البرنامج. يدفع من ينطلق من نقطة غير نقطة الانطلاق الأساسية نفس السعر مع رسم الخدمة الإضافية فقط.',
        ...programTotals(ordered),
        legs: {
          create: legs.map((l, i) => ({
            tripId: tripIds[l],
            sequenceNo: i + 1,
          })),
        },
      },
    });
    programIds[key] = p.id;
    return p;
  };
  await createProgram('COAST', ['P1A', 'P1B'], {
    title: 'الساحل وجزيرة أرواد — يومان',
    description:
      'من دمشق إلى طرطوس برّاً، ومنها إلى جزيرة أرواد بحراً: مبيت في طرطوس، غداء سمك في الجزيرة، والعودة مساءً.',
    category: 'CULTURAL',
    branch: 'DAM',
    deadline: at(22, 23, 59),
    min: 10,
    max: 35,
    cover: images.arwad,
    isPublic: true,
  });
  await createProgram('UMRAH', ['U1', 'U2', 'U3'], {
    title: 'عمرة مباركة — 8 أيام',
    description:
      'رحلة عمرة متكاملة: طيران دمشق – جدة ذهاباً وإياباً، نقل برّي بين جدة ومكة والمدينة، إقامة قرب الحرمين وباقة وجبات. يؤمّن المكتب التأشيرة لكل معتمر.',
    category: 'RELIGIOUS',
    branch: null,
    deadline: at(28, 23, 59),
    min: 20,
    max: 45,
    cover: images.umrah,
    isPublic: true,
  });

  // ------------------------------------------------------------ offers
  const family = await prisma.offer.create({
    data: {
      title: 'عرض العائلة — خصم 10%',
      description: 'خصم 10% على رحلة اللاذقية لكل الحجوزات خلال فترة العرض.',
      kind: 'DISCOUNT',
      discountMode: 'PERCENT',
      discountValue: toMoney(10),
      validFrom: dateOnly(-10),
      validTo: dateOnly(9),
      isPublic: true,
      coverImageUrl: images.latakia,
      targets: { create: [{ tripId: tripIds.LTK }] },
    },
  });
  await prisma.offer.create({
    data: {
      title: 'خصم الحجز المبكر للعمرة',
      description: '50 دولاراً أقل لكل معتمر يحجز قبل نهاية العرض.',
      kind: 'DISCOUNT',
      discountMode: 'FIXED',
      discountValue: toMoney(50),
      validFrom: dateOnly(-3),
      validTo: dateOnly(20),
      isPublic: true,
      coverImageUrl: images.umrah,
      targets: { create: [{ programId: programIds.UMRAH }] },
    },
  });
  // bundle: hotel 2 nights + restaurant 2 days, 15 % off (OFR-01, OFR-02)
  const bundleLines = [
    { k: 'H_LTK_SEA', quantity: 2 },
    { k: 'R_LTK', quantity: 2 },
  ].map(({ k, quantity }) => {
    const it = items[k];
    const cost = lineCost(it.cost, quantity);
    const rule = ruleFor(services[it.kind], it.companyId);
    return {
      it,
      quantity,
      cost,
      rule,
      costSnapshot: cost,
      sellingPrice: sellingPrice(cost, rule.mode, rule.value),
    };
  });
  const bundle = bundleTotals(bundleLines, 'PERCENT', '15');
  const bundleOffer = await prisma.offer.create({
    data: {
      title: 'باقة اللاذقية: ليلتان بإطلالة بحرية + وجبات',
      description:
        'ليلتان في فندق لاميرا بإطلالة على البحر مع باقة الوجبات الكاملة، بخصم 15%. الانتقال على حسابكم.',
      kind: 'BUNDLE',
      discountMode: 'PERCENT',
      discountValue: toMoney(15),
      validFrom: dateOnly(-5),
      validTo: dateOnly(30),
      maxSeats: 20,
      currencyCode: 'SYP',
      costPerPerson: bundle.costPerPerson,
      pricePerPerson: bundle.pricePerPerson,
      isPublic: true,
      coverImageUrl: images.bundle,
      lines: {
        create: bundleLines.map((l, i) => ({
          companyItemId: l.it.id,
          serviceId: services[l.it.kind],
          sequenceNo: i + 1,
          unitCost: l.it.cost,
          quantity: l.quantity,
          costSnapshot: l.cost.toFixed(2),
          profitMode: l.rule.mode,
          profitValue: toMoney(l.rule.value),
          sellingPrice: l.sellingPrice.toFixed(2),
        })),
      },
    },
  });

  // ------------------------------------------------------------ customers
  type Cust = { id: string; name: string; branch: string };
  const customers: Cust[] = [];
  const usedPhones = new Set<string>();
  const makeCustomer = async (
    branch: string,
    opts: { passport?: boolean; foreign?: 'LB'; created?: Date } = {},
  ) => {
    const female = rnd() < 0.45;
    const name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
    let phone = '';
    do phone = `09${Math.floor(30000000 + rnd() * 69999999)}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    const nat = opts.foreign ?? 'SY';
    const c = await prisma.customer.create({
      data: {
        fullName: name,
        phone,
        nationalityCountryId: countries[nat],
        birthDate: new Date(
          Date.UTC(
            1965 + Math.floor(rnd() * 40),
            Math.floor(rnd() * 12),
            1 + Math.floor(rnd() * 27),
          ),
        ),
        gender: female ? 'FEMALE' : 'MALE',
        branchId: branches[branch],
        createdById: branch === 'ALP' ? users.empAlp : users.empDam,
        createdAt: opts.created,
        documents: {
          create: [
            ...(nat === 'SY'
              ? [
                  {
                    docType: 'SYRIAN_ID' as const,
                    docNumber: String(
                      Math.floor(1000000000 + rnd() * 8999999999),
                    ),
                    issuingCountryId: countries.SY,
                  },
                ]
              : []),
            ...(opts.passport || nat !== 'SY'
              ? [
                  {
                    docType: 'PASSPORT' as const,
                    docNumber: `${nat === 'SY' ? 'N' : 'LR'}${Math.floor(1000000 + rnd() * 8999999)}`,
                    issuingCountryId: countries[nat],
                    issuedOn: dateOnly(-700),
                    expiresOn: dateOnly(1500),
                  },
                ]
              : []),
            ...(nat !== 'SY'
              ? [
                  {
                    docType: 'RESIDENCE' as const,
                    docNumber: `RS-${Math.floor(100000 + rnd() * 899999)}`,
                    issuingCountryId: countries.SY,
                    expiresOn: dateOnly(400),
                  },
                ]
              : []),
          ],
        },
      },
    });
    const cust = { id: c.id, name, branch };
    customers.push(cust);
    return cust;
  };

  // ------------------------------------------------------------ bookings
  const seats: Record<string, number> = {};
  const programSeats: Record<string, number> = {};
  let offerSeats = 0;
  interface BookingSpec {
    target: { trip?: string; program?: string; offer?: boolean };
    branch: string;
    by: string;
    passengers: Cust[];
    status: 'PENDING' | 'CONFIRMED' | 'WAITLIST' | 'CANCELLED';
    pay?: 'full' | 'partial' | 'none';
    created: Date;
    pickup?: string;
    discount?: { id: string; title: string; perPerson: string };
    refund?: { amount: string; reason: string };
    cancelReason?: string;
  }
  const createBooking = async (b: BookingSpec) => {
    const meta = b.target.trip
      ? {
          price: tripMeta[b.target.trip].price,
          cost: tripMeta[b.target.trip].cost,
          currency: tripMeta[b.target.trip].currency,
        }
      : b.target.program
        ? await prisma.program
            .findUniqueOrThrow({ where: { id: programIds[b.target.program] } })
            .then((p) => ({
              price: p.pricePerPerson.toString(),
              cost: p.costPerPerson.toString(),
              currency: p.currencyCode,
            }))
        : {
            price: bundle.pricePerPerson,
            cost: bundle.costPerPerson,
            currency: 'SYP',
          };
    const n = b.passengers.length;
    const pickup = b.pickup
      ? await prisma.tripPickupPoint.findFirst({
          where: { tripId: tripIds[b.target.trip!], cityId: cities[b.pickup] },
        })
      : null;
    const surcharge = D(pickup?.surcharge ?? 0);
    const perDiscount = D(b.discount?.perPerson ?? 0);
    const total = D(meta.price).sub(perDiscount).add(surcharge).mul(n);
    const confirmed =
      b.status === 'CONFIRMED' || (b.status === 'CANCELLED' && b.refund);
    const booking = await prisma.booking.create({
      data: {
        bookingNo: await nextNumber('BK', 6, b.created),
        tripId: b.target.trip ? tripIds[b.target.trip] : null,
        programId: b.target.program ? programIds[b.target.program] : null,
        offerId: b.target.offer ? bundleOffer.id : null,
        payerCustomerId: b.passengers[0].id,
        pickupPointId: pickup?.id ?? null,
        branchId: branches[b.branch],
        createdById: users[b.by],
        status: b.status,
        passengerCount: n,
        currencyCode: meta.currency,
        pricePerPerson: toMoney(meta.price),
        costPerPerson: toMoney(meta.cost),
        surchargePerPerson: surcharge.toFixed(2),
        discountOfferId: b.discount?.id ?? null,
        discountTitle: b.discount?.title ?? null,
        discountAmount: perDiscount.mul(n).toFixed(2),
        totalAmount: total.toFixed(2),
        confirmedAt: confirmed
          ? new Date(b.created.getTime() + 3_600_000)
          : null,
        cancelledAt:
          b.status === 'CANCELLED'
            ? new Date(b.created.getTime() + 2 * 86_400_000)
            : null,
        cancelReason:
          b.status === 'CANCELLED' ? (b.cancelReason ?? 'طلب الزبون') : null,
        createdAt: b.created,
        passengers: {
          create: b.passengers.map((p, i) => ({
            customerId: p.id,
            sortOrder: i,
          })),
        },
      },
      include: { passengers: true },
    });
    // documents printed on the manifest
    for (const p of booking.passengers) {
      const docs = await prisma.customerDocument.findMany({
        where: { customerId: p.customerId },
      });
      const doc =
        (b.target.program === 'UMRAH'
          ? docs.find((d) => d.docType === 'PASSPORT')
          : undefined) ??
        docs.find((d) => d.docType === 'SYRIAN_ID') ??
        docs.find((d) => d.docType === 'PASSPORT');
      if (doc)
        await prisma.bookingPassenger.update({
          where: { id: p.id },
          data: { documentId: doc.id },
        });
    }
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: 'CREATED',
        actorId: users[b.by],
        createdAt: b.created,
      },
    });

    let paid = D(0);
    const payTotal =
      b.pay === 'full'
        ? total
        : b.pay === 'partial'
          ? total.mul(0.4).toDecimalPlaces(0)
          : D(0);
    const amounts =
      b.pay === 'full' && rnd() < 0.5
        ? [
            total.mul(0.5).toDecimalPlaces(0),
            total.sub(total.mul(0.5).toDecimalPlaces(0)),
          ]
        : payTotal.gt(0)
          ? [payTotal]
          : [];
    let firstPayment: string | null = null;
    for (const [i, amount] of amounts.entries()) {
      paid = paid.add(amount);
      const when = new Date(
        b.created.getTime() + (i * 3 + 0.5) * 3_600_000 * (i ? 24 : 1),
      );
      const p = await prisma.payment.create({
        data: {
          receiptNo: await nextNumber('RCP', 6, when),
          bookingId: booking.id,
          branchId: branches[b.branch],
          kind: total.sub(paid).lte(0) ? 'FULL' : 'PARTIAL',
          amount: amount.toFixed(2),
          currencyCode: meta.currency,
          payerName: b.passengers[0].name,
          paidAt: when,
          balanceAfter: total.sub(paid).toFixed(2),
          receivedById: users[b.by],
          createdAt: when,
        },
      });
      firstPayment ??= p.id;
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'PAYMENT',
          actorId: users[b.by],
          data: { receiptNo: p.receiptNo, amount: p.amount.toString() },
          createdAt: when,
        },
      });
    }
    let refunded = D(0);
    if (b.refund && firstPayment) {
      refunded = D(b.refund.amount);
      const when = new Date(b.created.getTime() + 2 * 86_400_000);
      const original = await prisma.payment.findUniqueOrThrow({
        where: { id: firstPayment },
      });
      await prisma.payment.create({
        data: {
          receiptNo: await nextNumber('RCP', 6, when),
          bookingId: booking.id,
          branchId: branches[b.branch],
          kind: 'REFUND',
          refundOfId: firstPayment,
          amount: refunded.toFixed(2),
          currencyCode: meta.currency,
          payerName: original.payerName,
          paidAt: when,
          balanceAfter: total.sub(paid).add(refunded).toFixed(2),
          reason: b.refund.reason,
          receivedById: users.admin,
          createdAt: when,
        },
      });
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paidAmount: paid.toFixed(2),
        refundedAmount: refunded.toFixed(2),
      },
    });
    if (b.status === 'CONFIRMED') {
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'CONFIRMED',
          actorId: users[b.by],
          createdAt: new Date(b.created.getTime() + 3_600_000),
        },
      });
      if (b.target.trip) seats[b.target.trip] = (seats[b.target.trip] ?? 0) + n;
      if (b.target.program) {
        programSeats[b.target.program] =
          (programSeats[b.target.program] ?? 0) + n;
        const legs = await prisma.programTrip.findMany({
          where: { programId: programIds[b.target.program] },
        });
        for (const l of legs) {
          const key = Object.keys(tripIds).find(
            (k) => tripIds[k] === l.tripId,
          )!;
          seats[key] = (seats[key] ?? 0) + n;
        }
      }
      if (b.target.offer) offerSeats += n;
    }
    if (b.status === 'WAITLIST')
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'WAITLISTED',
          actorId: users[b.by],
        },
      });
    if (b.status === 'CANCELLED')
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'CANCELLED',
          actorId: users.admin,
          data: { reason: b.cancelReason ?? 'طلب الزبون' },
        },
      });
    return booking;
  };

  const group = async (
    branch: string,
    size: number,
    opts: { passport?: boolean } = {},
  ) => {
    const list: Cust[] = [];
    for (let i = 0; i < size; i++) list.push(await makeCustomer(branch, opts));
    return list;
  };
  const familyDiscount = (price: string) => ({
    id: family.id,
    title: family.title,
    perPerson: D(price).mul(0.1).toFixed(2),
  });

  // Latakia: 26 confirmed seats, pending bookings, a Homs boarding, a foreigner, a cancellation with refund
  for (const [size, status, pay, branch, by, pickup] of [
    [4, 'CONFIRMED', 'full', 'DAM', 'empDam', undefined],
    [3, 'CONFIRMED', 'partial', 'DAM', 'empDam', 'HMS'],
    [2, 'CONFIRMED', 'full', 'DAM', 'empDam2', undefined],
    [5, 'CONFIRMED', 'partial', 'DAM', 'mgrDam', undefined],
    [2, 'CONFIRMED', 'full', 'ALP', 'empAlp', undefined],
    [4, 'CONFIRMED', 'partial', 'DAM', 'empDam', undefined],
    [3, 'CONFIRMED', 'full', 'ALP', 'empAlp', undefined],
    [3, 'CONFIRMED', 'partial', 'DAM', 'empDam2', 'HMS'],
    [2, 'PENDING', 'partial', 'DAM', 'empDam', undefined],
    [3, 'PENDING', 'none', 'ALP', 'empAlp', undefined],
  ] as const) {
    await createBooking({
      target: { trip: 'LTK' },
      branch,
      by,
      passengers: await group(branch, size),
      status,
      pay,
      created: at(-6 + Math.floor(rnd() * 5), 11),
      pickup,
      discount: familyDiscount(tripMeta.LTK.price),
    });
  }
  const foreigner = await makeCustomer('DAM', { foreign: 'LB' });
  await createBooking({
    target: { trip: 'LTK' },
    branch: 'DAM',
    by: 'empDam',
    passengers: [foreigner],
    status: 'PENDING',
    pay: 'partial',
    created: at(-1, 12),
    discount: familyDiscount(tripMeta.LTK.price),
  });
  await createBooking({
    target: { trip: 'LTK' },
    branch: 'DAM',
    by: 'empDam',
    passengers: await group('DAM', 2),
    status: 'CANCELLED',
    pay: 'full',
    created: at(-9, 10),
    discount: familyDiscount(tripMeta.LTK.price),
    refund: {
      amount: D(tripMeta.LTK.price).mul(0.9).mul(2).mul(0.5).toFixed(2),
      reason: 'إلغاء قبل 7 أيام — استرجاع 50%',
    },
    cancelReason: 'ظرف عائلي',
  });

  // Aleppo: full (30/30) + 2 on the waiting list
  for (const size of [4, 3, 5, 2, 4, 3, 5, 4])
    await createBooking({
      target: { trip: 'ALP' },
      branch: 'ALP',
      by: pick(['empAlp', 'mgrAlp']),
      passengers: await group('ALP', size),
      status: 'CONFIRMED',
      pay: rnd() < 0.6 ? 'full' : 'partial',
      created: at(-8 + Math.floor(rnd() * 7), 10),
    });
  for (const size of [2, 3])
    await createBooking({
      target: { trip: 'ALP' },
      branch: 'ALP',
      by: 'empAlp',
      passengers: await group('ALP', size),
      status: 'WAITLIST',
      pay: 'partial',
      created: at(-1, 15),
    });

  // Wadi al-Nasara: 14 of the minimum 15 — closed, waiting for the decision
  for (const size of [4, 3, 4, 3])
    await createBooking({
      target: { trip: 'WNS' },
      branch: 'DAM',
      by: 'empDam',
      passengers: await group('DAM', size),
      status: 'CONFIRMED',
      pay: 'full',
      created: at(-10 + Math.floor(rnd() * 6), 10),
    });

  // Bosra: completed and fully paid
  for (const size of [5, 4, 6, 3, 4])
    await createBooking({
      target: { trip: 'BSR' },
      branch: 'DAM',
      by: 'empDam2',
      passengers: await group('DAM', size),
      status: 'CONFIRMED',
      pay: 'full',
      created: at(-25 + Math.floor(rnd() * 6), 10),
    });

  // Coast program
  for (const size of [4, 2, 3, 5])
    await createBooking({
      target: { program: 'COAST' },
      branch: 'DAM',
      by: pick(['empDam', 'empDam2']),
      passengers: await group('DAM', size),
      status: 'CONFIRMED',
      pay: rnd() < 0.5 ? 'full' : 'partial',
      created: at(-4 + Math.floor(rnd() * 3), 12),
    });
  await createBooking({
    target: { program: 'COAST' },
    branch: 'DAM',
    by: 'empDam',
    passengers: await group('DAM', 2),
    status: 'PENDING',
    pay: 'none',
    created: at(0, 10),
  });

  // Umrah (international, USD) with passports, the early-booking discount and visas
  const umrahOffer = await prisma.offer.findFirstOrThrow({
    where: { title: 'خصم الحجز المبكر للعمرة' },
  });
  const umrahBookings = [];
  for (const [size, branch, by] of [
    [3, 'DAM', 'empDam'],
    [2, 'ALP', 'empAlp'],
    [4, 'DAM', 'mgrDam'],
    [2, 'DAM', 'empDam2'],
  ] as const)
    umrahBookings.push(
      await createBooking({
        target: { program: 'UMRAH' },
        branch,
        by,
        passengers: await group(branch, size, { passport: true }),
        status: 'CONFIRMED',
        pay: 'partial',
        created: at(-2, 13),
        discount: {
          id: umrahOffer.id,
          title: umrahOffer.title,
          perPerson: '50.00',
        },
      }),
    );
  for (const [i, b] of umrahBookings.entries()) {
    for (const [j, p] of b.passengers.entries()) {
      const status =
        i === 0
          ? 'APPROVED'
          : i === 1
            ? 'SUBMITTED'
            : j === 0
              ? 'SUBMITTED'
              : 'NOT_STARTED';
      await prisma.visaApplication.create({
        data: {
          passengerId: p.id,
          countryId: countries.SA,
          status,
          visaNumber:
            status === 'APPROVED'
              ? `SA-UMR-${Math.floor(100000 + rnd() * 899999)}`
              : null,
          submittedAt: status !== 'NOT_STARTED' ? at(-1, 10) : null,
          decidedAt: status === 'APPROVED' ? at(0, 9) : null,
          expiresOn: status === 'APPROVED' ? dateOnly(130) : null,
          fee: toMoney(120),
        },
      });
    }
  }

  // Bundle offer
  for (const size of [2, 2, 4])
    await createBooking({
      target: { offer: true },
      branch: 'DAM',
      by: 'empDam',
      passengers: await group('DAM', size),
      status: 'CONFIRMED',
      pay: 'full',
      created: at(-3 + Math.floor(rnd() * 3), 16),
    });

  // A year of completed trips for the monthly/yearly statistics (RPT-04)
  const historyThemes: [string, string, string, string][] = [
    ['LTK', 'T_DAM_LTK', 'H_LTK', 'T_LTK_DAM'],
    ['TRT', 'T_DAM_TRT', 'H_TRT', 'T_TRT_DAM'],
    ['ALP', 'T_DAM_ALP', 'H_ALP', 'T_ALP_DAM'],
  ];
  for (let m = 11; m >= 1; m--) {
    const [dest, out, hotel, back] = historyThemes[m % 3];
    const start = -m * 30 - 5;
    const key = `HIST${m}`;
    await createTrip(key, {
      title: `${dest === 'LTK' ? 'اللاذقية' : dest === 'TRT' ? 'طرطوس' : 'حلب'} — رحلة الشهر`,
      description: 'رحلة منفّذة (بيانات تاريخية للإحصائيات).',
      category: dest === 'ALP' ? 'HISTORICAL' : 'LEISURE',
      branch: m % 4 === 0 ? 'ALP' : 'DAM',
      origin: 'DAM',
      destination: dest,
      start: at(start, 8),
      end: at(start + 2, 18),
      deadline: at(start - 3, 23, 59),
      min: 10,
      max: 40,
      currency: 'SYP',
      status: 'COMPLETED',
      isPublic: false,
      createdAt: at(start - 20, 10),
      lines: [
        [out, at(start, 8), at(start, 12)],
        [hotel, at(start, 13), at(start + 2, 11)],
        [back, at(start + 2, 13), at(start + 2, 18)],
      ],
    });
    const br = m % 4 === 0 ? 'ALP' : 'DAM';
    const count = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < count; i++)
      await createBooking({
        target: { trip: key },
        branch: br,
        by: br === 'ALP' ? 'empAlp' : pick(['empDam', 'empDam2']),
        passengers: await group(br, 2 + Math.floor(rnd() * 4)),
        status: 'CONFIRMED',
        pay: 'full',
        created: at(start - 15 + i * 2, 11),
      });
  }

  // seat counters = confirmed passengers (BR-12)
  for (const [key, n] of Object.entries(seats))
    await prisma.trip.update({
      where: { id: tripIds[key] },
      data: { confirmedSeats: n },
    });
  for (const [key, n] of Object.entries(programSeats))
    await prisma.program.update({
      where: { id: programIds[key] },
      data: { confirmedSeats: n },
    });
  await prisma.offer.update({
    where: { id: bundleOffer.id },
    data: { confirmedSeats: offerSeats },
  });
  // closed / completed trips record the passengers at closing (CLS-02)
  for (const key of Object.keys(tripIds)) {
    const t = await prisma.trip.findUniqueOrThrow({
      where: { id: tripIds[key] },
    });
    if (['CLOSED', 'CONFIRMED', 'COMPLETED'].includes(t.status))
      await prisma.trip.update({
        where: { id: t.id },
        data: { finalPassengerCount: t.confirmedSeats },
      });
  }

  // ------------------------------------------------------------ public site
  for (const [i, s] of [
    {
      title: 'صيف اللاذقية بدأ!',
      subtitle: 'أربعة أيام على البحر مع خصم العائلة 10%',
      imageUrl: images.latakia,
      linkType: 'TRIP' as const,
      tripId: tripIds.LTK,
    },
    {
      title: 'عمرة مباركة — 8 أيام',
      subtitle: 'طيران وإقامة قرب الحرمين ونقل بين المدن، والتأشيرة علينا',
      imageUrl: images.umrah,
      linkType: 'PROGRAM' as const,
      programId: programIds.UMRAH,
    },
    {
      title: 'باقة اللاذقية البحرية',
      subtitle: 'ليلتان بإطلالة بحرية مع الوجبات بخصم 15%',
      imageUrl: images.bundle,
      linkType: 'OFFER' as const,
      offerId: bundleOffer.id,
    },
    {
      title: 'الساحل وجزيرة أرواد',
      subtitle: 'برّاً إلى طرطوس وبحراً إلى أرواد',
      imageUrl: images.arwad,
      linkType: 'PROGRAM' as const,
      programId: programIds.COAST,
    },
  ].entries())
    await prisma.landingSlide.create({ data: { ...s, sortOrder: i } });

  for (const [i, a] of [
    {
      title: 'أكثر من 15,000 مسافر منذ 2009',
      description: 'رافقنا آلاف العائلات في رحلات داخل سوريا وخارجها.',
      achievedOn: dateOnly(-60),
      images: [images.achv1, images.achv3],
    },
    {
      title: 'شهادة تميّز من وزارة السياحة 2025',
      description: 'تكريماً لجودة الخدمة والتزام المواعيد.',
      achievedOn: dateOnly(-300),
      images: [images.achv2],
    },
    {
      title: '120 رحلة عمرة منظّمة',
      description: 'برامج عمرة متكاملة بتأشيرات مؤمّنة لكل معتمر.',
      achievedOn: dateOnly(-120),
      images: [images.umrah, images.achv4],
    },
  ].entries())
    await prisma.achievement.create({
      data: {
        title: a.title,
        description: a.description,
        achievedOn: a.achievedOn,
        sortOrder: i,
        images: { create: a.images.map((url, j) => ({ url, sortOrder: j })) },
      },
    });

  for (const [i, p] of [
    {
      slug: 'terms',
      title: 'الشروط والأحكام',
      body: 'الحجز عبر الصفحة يتم بالتواصل مع المكتب على واتساب، ولا يُعتبر مؤكداً قبل دفع العربون وتسليم الوثائق المطلوبة.\n\nيشمل السعر المعلن الخدمات المذكورة في تفاصيل الرحلة فقط.\n\nيحق للمكتب إلغاء الرحلة إذا لم يكتمل الحد الأدنى للمسافرين، مع إعادة كامل المبلغ المدفوع.',
    },
    {
      slug: 'cancellation',
      title: 'سياسة الإلغاء والاسترجاع',
      body: 'الإلغاء قبل 14 يوماً من الانطلاق: استرجاع 100% من المدفوع.\nالإلغاء بين 7 و14 يوماً: استرجاع 50%.\nالإلغاء قبل أقل من 7 أيام: لا يُسترجع العربون.\n\nتُسجَّل كل عملية استرجاع بوصل رسمي مرتبط بالدفعة الأصلية.',
    },
    {
      slug: 'privacy',
      title: 'سياسة الخصوصية',
      body: 'نستخدم بيانات الهوية وجواز السفر فقط لإتمام الحجز وتأمين التأشيرات والفنادق.\n\nتُحفظ صور الوثائق في مكان آمن ولا يطّلع عليها إلا الموظفون المخوّلون.\n\nيمكنك طلب حذف بياناتك بعد انتهاء رحلتك.',
    },
  ].entries())
    await prisma.policy.create({ data: { ...p, sortOrder: i } });

  // CTR: requests from the landing page
  for (const r of [
    {
      name: 'منى السعدي',
      phone: '0944555666',
      from: 'DAM',
      to: 'LTK',
      days: [30, 34],
      n: 5,
      status: 'NEW' as const,
      branch: null,
      items: [
        { s: 'HOTEL', c: 'LAMIRA' },
        { s: 'RESTAURANT', c: 'SHATI' },
        { s: 'TRANSPORT', c: 'AMIR', m: 'LAND' as const },
      ],
      message: 'نفضّل غرف متجاورة للعائلة.',
    },
    {
      name: 'فراس النعسان',
      phone: '0933222111',
      from: 'ALP',
      to: 'KSB',
      days: [18, 20],
      n: 8,
      status: 'NEW' as const,
      branch: 'ALP',
      items: [
        { s: 'HOTEL', other: 'فندق في كسب قريب من الغابة' },
        { s: 'TRANSPORT', c: 'AMIR', m: 'LAND' as const },
      ],
    },
    {
      name: 'دارين خوري',
      phone: '0955777888',
      from: 'DAM',
      to: 'BEY',
      days: [45, 48],
      n: 2,
      status: 'CONTACTED' as const,
      branch: 'DAM',
      items: [
        { s: 'HOTEL', other: 'فندق في الحمرا — بيروت' },
        { s: 'RESTAURANT', other: 'مطاعم جبيل' },
        { s: 'TRANSPORT', other: 'سيارة خاصة مع سائق', m: 'LAND' as const },
      ],
    },
  ]) {
    await prisma.customTripRequest.create({
      data: {
        requestNo: await nextNumber('REQ', 4),
        contactName: r.name,
        contactPhone: r.phone,
        passengersCount: r.n,
        desiredFrom: dateOnly(r.days[0]),
        desiredTo: dateOnly(r.days[1]),
        originCityId: cities[r.from],
        destinationCityId: cities[r.to],
        categoryId: categories.LEISURE,
        message: r.message,
        status: r.status,
        assignedBranchId: r.branch ? branches[r.branch] : null,
        staffNotes:
          r.status === 'CONTACTED'
            ? 'تم الاتصال، بانتظار تأكيد التواريخ.'
            : null,
        items: {
          create: r.items.map((i) => ({
            serviceId: services[i.s],
            companyId: 'c' in i && i.c ? companies[i.c].id : null,
            otherText: 'other' in i ? i.other : null,
            transportMode: 'm' in i ? i.m : null,
          })),
        },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: 'system.seeded',
      entityType: 'system',
      summary: 'Demo data loaded',
    },
  });
  const counts = await Promise.all([
    prisma.trip.count(),
    prisma.program.count(),
    prisma.booking.count(),
    prisma.customer.count(),
    prisma.payment.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} trips, ${counts[1]} programs, ${counts[2]} bookings, ${counts[3]} customers, ${counts[4]} payments. Password for every demo account: ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
