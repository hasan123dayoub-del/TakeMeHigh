/**
 * Safarni demo data (fictional). Run with `npm run db:seed` (or `npm run db:reset` to rebuild).
 *
 * Office 1 "شام للسياحة والسفر" (Damascus + Aleppo branches) shows the full workflow, including
 * the coach example from the brief: the transport company charges the office 200,000 SYP net per
 * passenger, the office sells it at +15% (230,000) and collects everything from the customer.
 * Office 2 "رحلات الساحل" exists to demonstrate tenant isolation.
 * Dates are relative to the day the seed runs.
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { ALL_PERMISSIONS, DEFAULT_ROLES, PERMISSIONS } from '@travelos/shared';
import { PrismaClient, type BookingStatus, type SupplierType, type TripStatus, type TripType } from '../src/generated/prisma/client';
import { D, sellingPrice, toMoney } from '../src/common/utils/money';
import { bookingReference, receiptNumber } from '../src/common/utils/codes';

loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

export const DEMO_PASSWORD = 'Safarni@2026';

// deterministic pseudo-random so every reset gives the same story
let seed = 20261122;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const day = (offset: number) => new Date(today.getTime() + offset * 86_400_000);

const FIRST = ['أحمد', 'محمد', 'سارة', 'خالد', 'ليلى', 'عمر', 'رنا', 'يوسف', 'نور', 'هادي', 'دانة', 'باسل', 'ريم', 'سامر', 'هبة', 'طارق', 'جنى', 'كريم', 'لمى', 'فادي'];
const LAST = ['المصري', 'الحلبي', 'الشامي', 'درويش', 'حمدان', 'العبود', 'قصاب', 'منصور', 'زين', 'عيسى', 'حجازي', 'صباغ'];

async function main() {
  // ------------------------------------------------------------ reference data
  await prisma.currency.createMany({
    data: [
      { code: 'SYP', name: 'Syrian Pound', nameAr: 'ليرة سورية', symbol: 'ل.س', decimals: 0 },
      { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', decimals: 2 },
    ],
    skipDuplicates: true,
  });
  await prisma.permission.createMany({
    data: ALL_PERMISSIONS.map((key) => ({ key, group: PERMISSIONS[key].group, description: PERMISSIONS[key].en })),
    skipDuplicates: true,
  });
  const permissionIds = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));

  if (await prisma.office.findUnique({ where: { slug: 'sham-travel' } })) {
    console.log('Demo data already exists. Use "npm run db:reset" to rebuild it.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.create({
    data: { email: 'platform@safarni.local', fullName: 'Safarni Platform', passwordHash, isPlatformAdmin: true, locale: 'AR' },
  });

  // ------------------------------------------------------------ helpers
  async function createOffice(input: {
    name: string; slug: string; city: string; phone: string; whatsapp: string; lat: string; lng: string;
    address: string; description: string; brandColor: string;
    branches: Array<{ name: string; city: string; lat: string; lng: string; address: string; isMain?: boolean }>;
  }) {
    const office = await prisma.office.create({
      data: {
        name: input.name, slug: input.slug, city: input.city, country: 'SY', phone: input.phone,
        whatsappNumber: input.whatsapp, email: `info@${input.slug}.safarni.local`, address: input.address,
        latitude: input.lat, longitude: input.lng, description: input.description, brandColor: input.brandColor,
        defaultCurrencyCode: 'SYP', publicPageEnabled: true,
        bookingTerms: 'يُثبَّت الحجز بعد تأكيده من المكتب. تُدفع الأقساط نقداً في المكتب وتُسلَّم إيصالات رسمية بكل دفعة.',
        cancellationTerms: 'الإلغاء قبل ٧ أيام من موعد الرحلة يُسترد المبلغ كاملاً، وبعدها تُطبق سياسة المكتب.',
        currencies: { create: [{ currencyCode: 'SYP' }, { currencyCode: 'USD' }] },
      },
    });
    const branches = [];
    for (const b of input.branches) {
      branches.push(
        await prisma.branch.create({
          data: { officeId: office.id, name: b.name, city: b.city, address: b.address, latitude: b.lat, longitude: b.lng, isMain: !!b.isMain, phone: input.phone },
        }),
      );
    }
    const roles: Record<string, string> = {};
    for (const r of DEFAULT_ROLES) {
      const role = await prisma.role.create({
        data: {
          officeId: office.id, name: r.name, description: r.description, scope: r.scope, isSystem: true,
          permissions: { create: r.permissions.map((key) => ({ permissionId: permissionIds.get(key)! })) },
        },
      });
      roles[r.key] = role.id;
    }
    return { office, branches, roles };
  }

  async function createMember(officeId: string, branchId: string, roleId: string, email: string, fullName: string, jobTitle: string) {
    const user = await prisma.user.create({ data: { email, fullName, passwordHash, phone: '+963 9' + String(Math.floor(rnd() * 1e8)).padStart(8, '0') } });
    return prisma.officeMember.create({ data: { userId: user.id, officeId, branchId, roleId, jobTitle } });
  }

  // ------------------------------------------------------------ office 1
  const sham = await createOffice({
    name: 'شام للسياحة والسفر', slug: 'sham-travel', city: 'دمشق', phone: '+963 11 333 4455', whatsapp: '+963 944 123 456',
    lat: '33.513800', lng: '36.276500', address: 'دمشق، شارع بغداد، بناء الريان، الطابق الأول', brandColor: '#3F70AB',
    description: 'مكتب سياحي مرخّص منذ ٢٠١٥ ينظم رحلات داخلية جماعية وعائلية إلى الساحل والمدن التاريخية والمقامات، مع فرق مرافقة وأسعار واضحة.',
    branches: [
      { name: 'فرع دمشق', city: 'دمشق', lat: '33.513800', lng: '36.276500', address: 'شارع بغداد', isMain: true },
      { name: 'فرع حلب', city: 'حلب', lat: '36.202100', lng: '37.134300', address: 'العزيزية، شارع القوتلي' },
    ],
  });
  const [damascus, aleppo] = sham.branches;
  const shamAdmin = await createMember(sham.office.id, damascus.id, sham.roles.ADMIN, 'admin@sham-travel.safarni.local', 'حسن دعبول', 'مدير المكتب');
  const recDamascus = await createMember(sham.office.id, damascus.id, sham.roles.RECEPTION, 'reception.damascus@sham-travel.safarni.local', 'رنا الصالح', 'موظفة استقبال');
  const recAleppo = await createMember(sham.office.id, aleppo.id, sham.roles.RECEPTION, 'reception.aleppo@sham-travel.safarni.local', 'مازن قدسي', 'موظف استقبال');

  const categories: Record<string, string> = {};
  for (const [name, nameAr] of [['Recreational', 'ترفيهي'], ['Historical', 'تاريخي'], ['Cultural', 'ثقافي'], ['Religious', 'ديني']] as const) {
    categories[name] = (await prisma.tourCategory.create({ data: { officeId: sham.office.id, name, nameAr } })).id;
  }

  const supplier = (type: SupplierType, name: string, city: string, phone: string, contactName: string, notes?: string) =>
    prisma.supplier.create({ data: { officeId: sham.office.id, type, name, city, phone, contactName, notes } });
  const nawras = await supplier('TRANSPORT', 'شركة النورس للنقل الجماعي (بولمان)', 'دمشق', '+963 11 222 7788', 'أبو سامر', 'بولمانات ٤٥ راكب مكيفة. السعر صافٍ للراكب ويُدفع عن طريق المكتب.');
  const amanaVip = await supplier('TRANSPORT', 'الأمانة VIP للنقل السياحي', 'دمشق', '+963 11 444 1199', 'فراس', 'باصات VIP ٢٨ مقعد.');
  const blueBeach = await supplier('HOTEL', 'فندق الشاطئ الأزرق', 'اللاذقية', '+963 41 255 0000', 'قسم الحجوزات');
  const lattakiaResort = await supplier('HOTEL', 'منتجع روتانا اللاذقية', 'اللاذقية', '+963 41 266 0000', 'المبيعات');
  const shahba = await supplier('HOTEL', 'فندق الشهباء', 'حلب', '+963 21 211 0000', 'الاستقبال');
  const shiraa = await supplier('RESTAURANT', 'مطعم الشراع', 'اللاذقية', '+963 41 233 4455', 'أبو علي');
  const baytJiddi = await supplier('RESTAURANT', 'مطعم بيت جدي', 'حلب', '+963 21 266 7788', 'أم كريم');

  const tour = (input: { name: string; slug: string; destination: string; category: string; days: number; nights: number; accommodation: string; transport: string; itinerary: Array<[string, string, string]> }) =>
    prisma.tour.create({
      data: {
        officeId: sham.office.id, categoryId: categories[input.category], name: input.name, slug: input.slug,
        destination: input.destination, days: input.days, nights: input.nights,
        description: `${input.name}: برنامج متكامل يشمل النقل والإقامة والوجبات مع مرافق من المكتب.`,
        accommodationInfo: input.accommodation, transportationInfo: input.transport,
        bookingTerms: 'يشمل السعر الخدمات المذكورة فقط. الأطفال دون ٤ سنوات مجاناً دون مقعد.',
        cancellationTerms: 'استرداد كامل قبل ٧ أيام، ٥٠٪ قبل ٣ أيام، ولا استرداد بعدها.',
        itinerary: { create: input.itinerary.map(([title, description, location], i) => ({ dayNumber: i + 1, title, description, location })) },
      },
    });

  const coastTour = await tour({
    name: 'دمشق – اللاذقية ٤ أيام', slug: 'damascus-latakia-4-days', destination: 'اللاذقية', category: 'Recreational', days: 4, nights: 3,
    accommodation: '٣ ليالٍ في فندق على البحر مع فطور', transport: 'بولمان مكيف ذهاباً وإياباً وتنقلات داخلية',
    itinerary: [
      ['الانطلاق إلى الساحل', 'التجمع صباحاً في دمشق والانطلاق مع استراحة في حمص، الوصول مساءً.', 'اللاذقية'],
      ['شاطئ وكورنيش', 'يوم حر على الشاطئ ثم جولة مسائية على الكورنيش الجنوبي.', 'اللاذقية'],
      ['قلعة صلاح الدين وكسب', 'زيارة قلعة صلاح الدين ثم غداء في كسب.', 'الحفة – كسب'],
      ['العودة', 'فطور ثم العودة إلى دمشق.', 'دمشق'],
    ],
  });
  const aleppoTour = await tour({
    name: 'حلب القديمة – يومان', slug: 'old-aleppo-2-days', destination: 'حلب', category: 'Historical', days: 2, nights: 1,
    accommodation: 'ليلة في فندق وسط المدينة', transport: 'باص سياحي',
    itinerary: [
      ['القلعة والأسواق', 'قلعة حلب، سوق المدينة، خان الوزير.', 'حلب'],
      ['الجامع الأموي والعودة', 'الجامع الأموي الكبير والجديدة ثم العودة.', 'حلب'],
    ],
  });
  const wadiTour = await tour({
    name: 'وادي النصارى وقلعة الحصن', slug: 'wadi-nasara-krak', destination: 'حمص', category: 'Cultural', days: 2, nights: 1,
    accommodation: 'ليلة في فندق جبلي', transport: 'بولمان',
    itinerary: [
      ['قلعة الحصن', 'زيارة قلعة الحصن ودير مار جرجس.', 'وادي النصارى'],
      ['مشتى الحلو والعودة', 'جولة في مشتى الحلو ثم العودة.', 'مشتى الحلو'],
    ],
  });
  const bosraTour = await tour({
    name: 'بصرى الشام – رحلة يوم', slug: 'bosra-day-trip', destination: 'درعا', category: 'Historical', days: 1, nights: 0,
    accommodation: 'بدون إقامة', transport: 'بولمان',
    itinerary: [['المسرح الروماني', 'زيارة المسرح الروماني والقلعة وغداء ثم العودة.', 'بصرى']],
  });

  // ------------------------------------------------------------ trips with per-service pricing
  type Svc = { type: SupplierType; supplierId: string; cost: string; profit: string; description: string };
  async function createTrip(input: {
    code: string; tourId: string; branchId: string; type: TripType; currency: 'SYP' | 'USD'; dep: number; nights: number;
    deadline: number; min: number; max: number; status: TripStatus; isPublic: boolean; services: Svc[];
  }) {
    const services = input.services.map((s) => ({ ...s, selling: sellingPrice(s.cost, s.profit) }));
    const cost = services.reduce((a, s) => a.add(s.cost), D(0));
    const selling = services.reduce((a, s) => a.add(s.selling), D(0));
    return prisma.trip.create({
      data: {
        officeId: sham.office.id, branchId: input.branchId, tourId: input.tourId, code: input.code, tripType: input.type,
        departureDate: day(input.dep), returnDate: day(input.dep + input.nights), currencyCode: input.currency,
        minPassengers: input.min, maxSeats: input.max, registrationDeadline: day(input.deadline), status: input.status,
        isPublic: input.isPublic, costPerPerson: toMoney(cost), sellingPricePerPerson: toMoney(selling),
        services: {
          create: services.map((s) => ({
            supplierId: s.supplierId, serviceType: s.type, description: s.description,
            costPerPerson: s.cost, profitPercent: s.profit, sellingPricePerPerson: toMoney(s.selling),
          })),
        },
      },
    });
  }

  // The brief's example: coach 200,000 SYP net per passenger, +15% -> 230,000.
  const coastStd = await createTrip({
    code: 'DL-STD-01', tourId: coastTour.id, branchId: damascus.id, type: 'STANDARD', currency: 'SYP', dep: 18, nights: 3,
    deadline: 12, min: 20, max: 45, status: 'OPEN', isPublic: true,
    services: [
      { type: 'TRANSPORT', supplierId: nawras.id, cost: '200000', profit: '15', description: 'بولمان مكيف ذهاب وإياب' },
      { type: 'HOTEL', supplierId: blueBeach.id, cost: '450000', profit: '20', description: '٣ ليالٍ مع فطور (غرفة مزدوجة)' },
      { type: 'RESTAURANT', supplierId: shiraa.id, cost: '150000', profit: '25', description: '٣ وجبات عشاء' },
    ],
  });
  const coastVip = await createTrip({
    code: 'DL-VIP-01', tourId: coastTour.id, branchId: damascus.id, type: 'VIP', currency: 'USD', dep: 28, nights: 3,
    deadline: 20, min: 10, max: 24, status: 'OPEN', isPublic: true,
    services: [
      { type: 'TRANSPORT', supplierId: amanaVip.id, cost: '25', profit: '20', description: 'باص VIP ٢٨ مقعد' },
      { type: 'HOTEL', supplierId: lattakiaResort.id, cost: '90', profit: '20', description: '٣ ليالٍ منتجع ٥ نجوم' },
      { type: 'RESTAURANT', supplierId: shiraa.id, cost: '20', profit: '25', description: 'عشاء بحري يومي' },
    ],
  });
  const aleppoTrip = await createTrip({
    code: 'ALP-01', tourId: aleppoTour.id, branchId: aleppo.id, type: 'STANDARD', currency: 'SYP', dep: 12, nights: 1,
    deadline: 6, min: 15, max: 30, status: 'OPEN', isPublic: true,
    services: [
      { type: 'TRANSPORT', supplierId: nawras.id, cost: '120000', profit: '15', description: 'باص سياحي' },
      { type: 'HOTEL', supplierId: shahba.id, cost: '180000', profit: '20', description: 'ليلة مع فطور' },
      { type: 'RESTAURANT', supplierId: baytJiddi.id, cost: '80000', profit: '25', description: 'غداء حلبي تقليدي' },
    ],
  });
  const wadiTrip = await createTrip({
    code: 'WN-01', tourId: wadiTour.id, branchId: damascus.id, type: 'STANDARD', currency: 'SYP', dep: 6, nights: 1,
    deadline: -1, min: 15, max: 40, status: 'REGISTRATION_CLOSED', isPublic: false,
    services: [
      { type: 'TRANSPORT', supplierId: nawras.id, cost: '150000', profit: '15', description: 'بولمان' },
      { type: 'HOTEL', supplierId: blueBeach.id, cost: '200000', profit: '20', description: 'ليلة جبلية' },
    ],
  });
  const bosraTrip = await createTrip({
    code: 'BS-01', tourId: bosraTour.id, branchId: damascus.id, type: 'STANDARD', currency: 'SYP', dep: -20, nights: 0,
    deadline: -27, min: 20, max: 45, status: 'COMPLETED', isPublic: false,
    services: [
      { type: 'TRANSPORT', supplierId: nawras.id, cost: '90000', profit: '15', description: 'بولمان' },
      { type: 'RESTAURANT', supplierId: shiraa.id, cost: '60000', profit: '25', description: 'غداء' },
    ],
  });
  await createTrip({
    code: 'ALP-02', tourId: aleppoTour.id, branchId: aleppo.id, type: 'STANDARD', currency: 'SYP', dep: 45, nights: 1,
    deadline: 38, min: 15, max: 30, status: 'DRAFT', isPublic: false,
    services: [{ type: 'TRANSPORT', supplierId: nawras.id, cost: '125000', profit: '15', description: 'باص سياحي' }],
  });

  await prisma.tripRegistrationDecision.create({
    data: { tripId: bosraTrip.id, decision: 'APPROVE', confirmedAtDecision: 25, minPassengers: 20, previousDeadline: day(-27), decidedById: shamAdmin.id, note: 'العدد مكتمل، تمت الموافقة على التنفيذ.' },
  });
  await prisma.tripSupervisor.createMany({ data: [{ tripId: coastStd.id, memberId: recDamascus.id }, { tripId: aleppoTrip.id, memberId: recAleppo.id }] });

  const familyOffer = await prisma.tripOffer.create({
    data: { officeId: sham.office.id, tripId: coastStd.id, title: 'عرض العائلة', description: 'خصم ١٠٪ على كامل الحجز للحجوزات قبل نهاية العرض', discountType: 'PERCENTAGE', discountValue: '10', startsAt: day(-3), endsAt: day(8) },
  });
  await prisma.tripOffer.create({
    data: { officeId: sham.office.id, tripId: coastVip.id, title: 'حجز مبكر VIP', description: 'خصم ١٥ دولار للشخص', discountType: 'FIXED', discountValue: '15', startsAt: day(-1), endsAt: day(14) },
  });

  // ------------------------------------------------------------ customers & bookings
  const customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = [];
  for (let i = 0; i < 18; i++) {
    customers.push(
      await prisma.customer.create({
        data: {
          officeId: sham.office.id, fullName: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
          phone: `+963 9${String(30000000 + i * 1234567).slice(0, 8)}`, nationalId: String(1000000000 + i * 7919),
          dateOfBirth: day(-365 * (22 + (i % 30))), address: i % 3 ? 'دمشق' : 'حلب',
          notes: i % 5 === 0 ? 'زبون دائم، يفضل المقاعد الأمامية.' : null,
        },
      }),
    );
  }

  let receiptSeq = 0;
  async function book(input: { trip: typeof coastStd; customer: (typeof customers)[number]; pax: number; status: BookingStatus; createdBy: string; daysAgo: number; pay?: 'full' | 'part' | 'none'; offer?: typeof familyOffer }) {
    const unit = D(input.trip.sellingPricePerPerson);
    const subtotal = unit.mul(input.pax);
    let discount = D(0);
    if (input.offer) {
      discount = input.offer.discountType === 'PERCENTAGE' ? subtotal.mul(D(input.offer.discountValue).div(100)) : D(input.offer.discountValue).mul(input.pax);
      discount = discount.toDecimalPlaces(2);
    }
    const total = subtotal.sub(discount);
    const createdAt = new Date(today.getTime() - input.daysAgo * 86_400_000 + 9 * 3_600_000);
    const booking = await prisma.booking.create({
      data: {
        officeId: sham.office.id, branchId: input.trip.branchId, tripId: input.trip.id, customerId: input.customer.id,
        reference: bookingReference(createdAt), status: input.status, passengerCount: input.pax, currencyCode: input.trip.currencyCode,
        unitPrice: toMoney(unit), unitCost: toMoney(input.trip.costPerPerson), subtotal: toMoney(subtotal),
        offerId: input.offer?.id, offerTitle: input.offer?.title, discountType: input.offer?.discountType, discountValue: input.offer?.discountValue,
        discountAmount: toMoney(discount), totalAmount: toMoney(total),
        confirmedAt: input.status === 'CONFIRMED' ? createdAt : null, createdById: input.createdBy, createdAt,
        passengers: {
          create: Array.from({ length: input.pax }, (_, i) => ({
            fullName: i === 0 ? input.customer.fullName : `${pick(FIRST)} ${input.customer.fullName.split(' ').slice(-1)[0]}`,
            nationality: 'سوري', documentType: i === 0 ? 'NATIONAL_ID' : pick(['NATIONAL_ID', 'FAMILY_BOOK'] as const),
            documentNumber: String(2000000000 + Math.floor(rnd() * 99999999)), sortOrder: i,
          })),
        },
        events: { create: [{ type: 'CREATED', toTripId: input.trip.id, actorId: input.createdBy, createdAt }, ...(input.status === 'CONFIRMED' ? [{ type: 'CONFIRMED' as const, actorId: input.createdBy, createdAt }] : []), ...(input.status === 'WAITING_LIST' ? [{ type: 'WAITLISTED' as const, actorId: input.createdBy, createdAt }] : [])] },
      },
    });
    const amounts = input.pay === 'full' ? [total] : input.pay === 'part' ? [total.mul(0.4).toDecimalPlaces(0)] : [];
    let paid = D(0);
    for (const amount of amounts) {
      receiptSeq += 1;
      await prisma.payment.create({
        data: {
          officeId: sham.office.id, branchId: input.trip.branchId, bookingId: booking.id, amount: toMoney(amount), currencyCode: input.trip.currencyCode,
          method: 'CASH', receiptNumber: `${receiptNumber(createdAt)}${receiptSeq}`, paidAt: new Date(createdAt.getTime() + 3_600_000), recordedById: input.createdBy,
        },
      });
      paid = paid.add(amount);
    }
    if (amounts.length) await prisma.booking.update({ where: { id: booking.id }, data: { paidAmount: toMoney(paid) } });
    return booking;
  }

  // Coast standard: 26 confirmed seats of 45, some pending (no seats), offer applied to recent ones
  const coastBookings: Array<[number, BookingStatus, 'full' | 'part' | 'none', boolean]> = [
    [4, 'CONFIRMED', 'full', true], [2, 'CONFIRMED', 'part', true], [3, 'CONFIRMED', 'full', false], [1, 'CONFIRMED', 'full', false],
    [5, 'CONFIRMED', 'part', true], [2, 'CONFIRMED', 'none', false], [4, 'CONFIRMED', 'full', false], [3, 'CONFIRMED', 'part', true],
    [2, 'CONFIRMED', 'full', false], [2, 'PENDING', 'none', true], [3, 'PENDING', 'none', false],
  ];
  for (const [i, [pax, status, pay, offer]] of coastBookings.entries()) {
    await book({ trip: coastStd, customer: customers[i], pax, status, pay, offer: offer ? familyOffer : undefined, createdBy: i % 2 ? recDamascus.id : shamAdmin.id, daysAgo: 12 - i });
  }
  // VIP in USD: 8 confirmed of 24
  for (const [i, pax] of [2, 2, 4].entries()) await book({ trip: coastVip, customer: customers[11 + i], pax, status: 'CONFIRMED', pay: i ? 'part' : 'full', createdBy: shamAdmin.id, daysAgo: 6 - i });
  // Aleppo: FULL (30/30) + 2 on the waiting list, booked by the Aleppo reception
  for (const [i, pax] of [4, 3, 5, 2, 4, 3, 5, 4].entries()) await book({ trip: aleppoTrip, customer: customers[(i + 4) % 18], pax, status: 'CONFIRMED', pay: i % 3 ? 'full' : 'part', createdBy: recAleppo.id, daysAgo: 15 - i });
  for (const [i, pax] of [2, 1].entries()) await book({ trip: aleppoTrip, customer: customers[14 + i], pax, status: 'WAITING_LIST', pay: 'none', createdBy: recAleppo.id, daysAgo: 2 - i });
  // Wadi: 14 confirmed < minimum 15 -> awaiting the admin decision
  for (const [i, pax] of [4, 3, 2, 5].entries()) await book({ trip: wadiTrip, customer: customers[i + 6], pax, status: 'CONFIRMED', pay: 'part', createdBy: recDamascus.id, daysAgo: 20 - i });
  // Bosra (completed): 25 travelled
  for (const [i, pax] of [5, 4, 6, 3, 4, 3].entries()) await book({ trip: bosraTrip, customer: customers[i + 2], pax, status: 'CONFIRMED', pay: 'full', createdBy: recDamascus.id, daysAgo: 40 - i });

  // A cancellation with a partial refund linked to the original payment
  const cancelled = await book({ trip: coastStd, customer: customers[17], pax: 2, status: 'CONFIRMED', pay: 'full', createdBy: recDamascus.id, daysAgo: 9 });
  const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: cancelled.id } });
  const refundAmount = D(payment.amount).mul(0.5).toDecimalPlaces(0);
  await prisma.refund.create({
    data: { officeId: sham.office.id, paymentId: payment.id, bookingId: cancelled.id, amount: toMoney(refundAmount), currencyCode: payment.currencyCode, reason: 'إلغاء قبل ٣ أيام من الموعد: استرداد ٥٠٪', refundedAt: day(-1), recordedById: shamAdmin.id },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { refundedAmount: toMoney(refundAmount) } });
  await prisma.booking.update({
    where: { id: cancelled.id },
    data: { status: 'CANCELLED', cancelledAt: day(-1), cancellationReason: 'ظرف عائلي', refundedAmount: toMoney(refundAmount), paidAmount: toMoney(D(payment.amount).sub(refundAmount)), events: { create: { type: 'CANCELLED', actorId: shamAdmin.id, createdAt: day(-1) } } },
  });

  // Seat counters = sum of CONFIRMED passengers (the only status that consumes seats)
  for (const t of await prisma.trip.findMany({ where: { officeId: sham.office.id } })) {
    const agg = await prisma.booking.aggregate({ where: { tripId: t.id, status: 'CONFIRMED' }, _sum: { passengerCount: true } });
    await prisma.trip.update({ where: { id: t.id }, data: { confirmedSeats: agg._sum.passengerCount ?? 0 } });
  }

  // Supplier payments: Bosra fully settled; an advance to the coach company for the coast trip
  const bosraServices = await prisma.tripService.findMany({ where: { tripId: bosraTrip.id } });
  for (const s of bosraServices) {
    await prisma.supplierPayment.create({ data: { officeId: sham.office.id, supplierId: s.supplierId, tripId: bosraTrip.id, amount: toMoney(D(s.costPerPerson).mul(25)), currencyCode: 'SYP', paidAt: day(-19), recordedById: shamAdmin.id, reference: 'تسوية رحلة بصرى' } });
  }
  await prisma.supplierPayment.create({ data: { officeId: sham.office.id, supplierId: nawras.id, tripId: coastStd.id, amount: '2000000.00', currencyCode: 'SYP', paidAt: day(-3), recordedById: shamAdmin.id, reference: 'دفعة مقدمة لحجز البولمان' } });

  await prisma.promoBanner.createMany({
    data: [
      { officeId: sham.office.id, tripId: coastStd.id, title: 'عرض العائلة: خصم ١٠٪ على رحلة اللاذقية', subtitle: '٤ أيام على البحر، بولمان وفندق ووجبات', startsAt: day(-3), endsAt: day(8), sortOrder: 1 },
      { officeId: sham.office.id, tripId: coastVip.id, title: 'الساحل VIP: منتجع ٥ نجوم', subtitle: 'مقاعد محدودة، حجز مبكر بخصم ١٥$', startsAt: day(-1), endsAt: day(14), sortOrder: 2 },
      { officeId: sham.office.id, tripId: aleppoTrip.id, title: 'حلب القديمة في يومين', subtitle: 'القلعة والأسواق والمطبخ الحلبي', startsAt: day(-5), endsAt: day(6), sortOrder: 3 },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { officeId: sham.office.id, userId: shamAdmin.userId, action: 'trip.published', entityType: 'trip', entityId: coastStd.id, summary: 'نشر رحلة دمشق – اللاذقية (عادي)', createdAt: day(-14) },
      { officeId: sham.office.id, userId: shamAdmin.userId, action: 'offer.created', entityType: 'trip', entityId: coastStd.id, summary: 'إضافة عرض العائلة ١٠٪', createdAt: day(-3) },
      { officeId: sham.office.id, userId: shamAdmin.userId, action: 'refund.recorded', entityType: 'booking', entityId: cancelled.id, summary: 'استرجاع ٥٠٪ لحجز ملغى', createdAt: day(-1) },
    ],
  });

  // ------------------------------------------------------------ office 2 (isolation demo)
  const coast = await createOffice({
    name: 'رحلات الساحل', slug: 'coast-tours', city: 'اللاذقية', phone: '+963 41 477 8899', whatsapp: '+963 955 777 888',
    lat: '35.531700', lng: '35.791500', address: 'اللاذقية، شارع ٨ آذار', brandColor: '#0F766E',
    description: 'رحلات يومية من اللاذقية إلى جزيرة أرواد والجبال.',
    branches: [{ name: 'فرع اللاذقية', city: 'اللاذقية', lat: '35.531700', lng: '35.791500', address: 'شارع ٨ آذار', isMain: true }],
  });
  const coastAdmin = await createMember(coast.office.id, coast.branches[0].id, coast.roles.ADMIN, 'admin@coast-tours.safarni.local', 'سامي عيسى', 'مدير');
  await createMember(coast.office.id, coast.branches[0].id, coast.roles.RECEPTION, 'reception@coast-tours.safarni.local', 'هبة زين', 'استقبال');
  const arwadTour = await prisma.tour.create({
    data: { officeId: coast.office.id, name: 'جزيرة أرواد – رحلة يوم', slug: 'arwad-day-trip', destination: 'طرطوس', days: 1, nights: 0, description: 'قارب إلى جزيرة أرواد وغداء بحري.', itinerary: { create: [{ dayNumber: 1, title: 'أرواد', description: 'القلعة والميناء وغداء بحري.', location: 'أرواد' }] } },
  });
  const boat = await prisma.supplier.create({ data: { officeId: coast.office.id, type: 'TRANSPORT', name: 'قوارب أرواد', city: 'طرطوس', phone: '+963 43 311 2233' } });
  const arwadTrip = await prisma.trip.create({
    data: {
      officeId: coast.office.id, branchId: coast.branches[0].id, tourId: arwadTour.id, code: 'AR-01', tripType: 'STANDARD', departureDate: day(9), returnDate: day(9),
      currencyCode: 'SYP', minPassengers: 10, maxSeats: 30, registrationDeadline: day(7), status: 'OPEN', isPublic: true, costPerPerson: '100000.00', sellingPricePerPerson: '120000.00',
      services: { create: [{ supplierId: boat.id, serviceType: 'TRANSPORT', costPerPerson: '100000', profitPercent: '20', sellingPricePerPerson: '120000.00', description: 'قارب ذهاب وإياب' }] },
    },
  });
  await prisma.promoBanner.create({ data: { officeId: coast.office.id, tripId: arwadTrip.id, title: 'أرواد: يوم في البحر', subtitle: 'من اللاذقية مع غداء بحري', startsAt: day(-2), endsAt: day(9) } });
  void coastAdmin;

  const counts = {
    offices: await prisma.office.count(), branches: await prisma.branch.count(), users: await prisma.user.count(),
    tours: await prisma.tour.count(), trips: await prisma.trip.count(), customers: await prisma.customer.count(),
    bookings: await prisma.booking.count(), passengers: await prisma.bookingPassenger.count(), payments: await prisma.payment.count(),
  };
  console.log('Seed complete:', counts);
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD} (see docs/DEMO.md)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
