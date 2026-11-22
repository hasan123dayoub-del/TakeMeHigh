import { defineMessages, fmt, type Locale } from '@/lib/i18n/shared';

/** Words shared by the public pages (landing, office page, trip page). */
export const pm = defineMessages({
  ar: {
    forOffices: 'لمكاتب السياحة',
    signIn: 'تسجيل الدخول',
    officeSignIn: 'دخول المكاتب',
    navTrips: 'الرحلات',
    navHow: 'كيف تحجز',
    navOffices: 'للمكاتب',
    home: 'الرئيسية',
    bookWhatsApp: 'احجز عبر واتساب',
    askWhatsApp: 'اسأل المكتب عبر واتساب',
    waitingListWhatsApp: 'اسأل عن قائمة الانتظار',
    whatsapp: 'واتساب',
    call: 'اتصال',
    email: 'بريد إلكتروني',
    viewTrip: 'تفاصيل الرحلة',
    viewOffice: 'صفحة المكتب',
    perPerson: 'للشخص',
    from: 'من',
    vip: 'VIP',
    standard: 'عادي',
    offer: 'عرض',
    offerEnds: 'ينتهي العرض {date}',
    soldOut: 'المقاعد مكتملة',
    noWhatsApp: 'المكتب لم يضف رقم واتساب بعد',
    includesTitle: 'يشمل',
    HOTEL: 'فندق',
    TRANSPORT: 'نقل',
    RESTAURANT: 'وجبات',
    poweredBy: 'مدعوم من سفرني — نظام تشغيل مكاتب السياحة',
    footerOffices: 'هل تدير مكتباً سياحياً؟',
    footerOfficesCta: 'ادخل إلى لوحة مكتبك',
    rights: '© 2026 سفرني',
    adsLabel: 'عروض المكاتب',
    pauseAds: 'إيقاف حركة العروض',
    playAds: 'تشغيل حركة العروض',
    adBy: 'من {office}',
    openInMaps: 'افتح في خرائط Google',
    mapTitle: 'موقع {name} على الخريطة',
    noLocation: 'لم يحدد المكتب موقعه على الخريطة بعد',
    errorTitle: 'تعذّر تحميل الصفحة',
    errorBody: 'لم نتمكن من الوصول إلى خادم سفرني. تحقق من اتصالك وحاول مجدداً.',
    retry: 'إعادة المحاولة',
    notFoundEyebrow: 'خطأ 404',
    notFoundTitle: 'هذه الصفحة غير متاحة',
    notFoundBody: 'ربما أوقف المكتب صفحته العامة، أو انتهت الرحلة، أو أن الرابط غير صحيح.',
    notFoundCta: 'تصفح الرحلات المتاحة',
    seatsLeftCount: 'مقاعد متاحة',
  },
  en: {
    forOffices: 'For tourism offices',
    signIn: 'Sign in',
    officeSignIn: 'Office sign in',
    navTrips: 'Trips',
    navHow: 'How to book',
    navOffices: 'For offices',
    home: 'Home',
    bookWhatsApp: 'Book on WhatsApp',
    askWhatsApp: 'Message the office on WhatsApp',
    waitingListWhatsApp: 'Ask about the waiting list',
    whatsapp: 'WhatsApp',
    call: 'Call',
    email: 'Email',
    viewTrip: 'Trip details',
    viewOffice: 'Office page',
    perPerson: 'per person',
    from: 'From',
    vip: 'VIP',
    standard: 'Standard',
    offer: 'Offer',
    offerEnds: 'Offer ends {date}',
    soldOut: 'Fully booked',
    noWhatsApp: 'This office has not added a WhatsApp number yet',
    includesTitle: 'Includes',
    HOTEL: 'Hotel',
    TRANSPORT: 'Transport',
    RESTAURANT: 'Meals',
    poweredBy: 'Powered by Safarni — the operating system for tourism offices',
    footerOffices: 'Do you run a tourism office?',
    footerOfficesCta: 'Sign in to your office workspace',
    rights: '© 2026 Safarni',
    adsLabel: 'Offers from offices',
    pauseAds: 'Pause the moving offers',
    playAds: 'Play the moving offers',
    adBy: 'by {office}',
    openInMaps: 'Open in Google Maps',
    mapTitle: 'Map location of {name}',
    noLocation: 'The office has not set its map location yet',
    errorTitle: 'We could not load this page',
    errorBody: 'Safarni could not be reached. Check your connection and try again.',
    retry: 'Try again',
    notFoundEyebrow: 'Error 404',
    notFoundTitle: 'This page is not available',
    notFoundBody: 'The office may have turned off its public page, the trip may have ended, or the link is wrong.',
    notFoundCta: 'Browse available trips',
    seatsLeftCount: 'seats available',
  },
});

/* ------------------------------------------------------------------ plurals (Arabic needs real forms) */

export function daysLabel(n: number, locale: Locale) {
  if (locale === 'en') return n === 1 ? '1 day' : `${n} days`;
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  if (n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

export function nightsLabel(n: number, locale: Locale) {
  if (locale === 'en') return n === 0 ? 'Day trip' : n === 1 ? '1 night' : `${n} nights`;
  if (n === 0) return 'رحلة يوم';
  if (n === 1) return 'ليلة واحدة';
  if (n === 2) return 'ليلتان';
  if (n <= 10) return `${n} ليالٍ`;
  return `${n} ليلة`;
}

/** "Last 3 seats" when it is urgent (≤ 5), otherwise "12 seats left". */
export function seatsLabel(n: number, locale: Locale) {
  if (locale === 'en') {
    if (n === 1) return 'Last seat';
    if (n <= 5) return `Last ${n} seats`;
    return `${n} seats left`;
  }
  if (n === 1) return 'آخر مقعد';
  if (n === 2) return 'آخر مقعدين';
  if (n <= 5) return `آخر ${n} مقاعد`;
  if (n <= 10) return `${n} مقاعد متاحة`;
  return `${n} مقعداً متاحاً`;
}

export function tripsCountLabel(n: number, locale: Locale) {
  if (locale === 'en') return n === 1 ? '1 trip' : `${n} trips`;
  if (n === 0) return 'لا رحلات';
  if (n === 1) return 'رحلة واحدة';
  if (n === 2) return 'رحلتان';
  if (n <= 10) return `${n} رحلات`;
  return `${n} رحلة`;
}

export { fmt };

/** API dates are calendar days (YYYY-MM-DD). Noon keeps them on the same day in every time zone. */
export const day = (iso: string | null | undefined) => (iso ? `${iso}T12:00:00` : null);
