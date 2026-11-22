/**
 * Demo scenario: "Horizon Travel & Tours", a mid-size agency in Damascus running group tours.
 * Everything here is fictional. Dates are relative to the day the seed runs, so the demo always
 * has upcoming departures, recent bookings and six months of history for the charts.
 */
export const DEMO_PASSWORD = 'TravelOS@2026';

export const AGENCY = {
  name: 'Horizon Travel & Tours',
  slug: 'horizon-travel',
  email: 'hello@horizon-travel.example',
  phone: '+963 11 555 0142',
  address: 'Abu Rummaneh, Al-Jalaa Street 18',
  city: 'Damascus',
  country: 'Syria',
  currency: 'USD',
  timezone: 'Asia/Damascus',
  licenseNumber: 'TA-2019-0457',
};

export const SETTINGS = {
  publicPageEnabled: true,
  publicTagline: 'Small-group journeys, planned to the last detail.',
  publicDescription:
    'Since 2019 we have guided families and friends across the region and beyond: heritage tours, ' +
    'religious journeys and city breaks, with trusted hotels and our own coach partners.',
  brandColor: '#0F766E',
  depositPercent: '30.00',
  balanceDueDaysBeforeDeparture: 7,
  whatsappNumber: '+963 944 555 142',
  bookingTerms:
    'A 30% deposit confirms your seat. The balance is due 7 days before departure. ' +
    'Cancellations more than 14 days before departure are refunded minus the deposit.',
};

export const USERS = [
  { fullName: 'Hasan Dayoub', email: 'owner@demo.travelos.local', role: 'OWNER', phone: '+963 944 100 001' },
  { fullName: 'Lina Haddad', email: 'admin@demo.travelos.local', role: 'ADMIN', phone: '+963 944 100 002' },
  { fullName: 'Omar Khatib', email: 'ops@demo.travelos.local', role: 'OPERATIONS_MANAGER', phone: '+963 944 100 003' },
  { fullName: 'Rana Saleh', email: 'agent@demo.travelos.local', role: 'BOOKING_AGENT', phone: '+963 944 100 004' },
  { fullName: 'Fadi Nasser', email: 'accounts@demo.travelos.local', role: 'ACCOUNTANT', phone: '+963 944 100 005' },
] as const;

export const CUSTOMERS = [
  ['Ahmad', 'Al-Masri', 'ahmad.masri@mail.example', '+963 933 210 411', 'Syrian', '1984-03-12', 'N0123456'],
  ['Maya', 'Hamdan', 'maya.hamdan@mail.example', '+963 944 381 902', 'Syrian', '1991-07-25', 'N0456721'],
  ['Khaled', 'Darwish', 'k.darwish@mail.example', '+963 955 774 120', 'Syrian', '1977-11-02', 'N0987345'],
  ['Sara', 'Youssef', 'sara.y@mail.example', '+961 3 554 218', 'Lebanese', '1995-01-30', 'LR551902'],
  ['Yousef', 'Abboud', 'yousef.abboud@mail.example', '+963 988 120 557', 'Syrian', '1969-05-19', 'N0331287'],
  ['Nour', 'Shami', 'nour.shami@mail.example', '+963 936 447 803', 'Syrian', '1999-09-08', 'N0774519'],
  ['Rami', 'Kassab', 'rami.kassab@mail.example', '+963 991 336 270', 'Syrian', '1988-12-14', 'N0219984'],
  ['Huda', 'Mansour', 'huda.mansour@mail.example', '+962 79 554 1180', 'Jordanian', '1982-04-03', 'JN441256'],
  ['Tarek', 'Zein', 'tarek.zein@mail.example', '+963 947 902 615', 'Syrian', '1993-06-21', 'N0662093'],
  ['Dana', 'Issa', 'dana.issa@mail.example', '+963 958 221 734', 'Syrian', '2001-02-17', 'N0880147'],
  ['Bassel', 'Hijazi', 'bassel.hijazi@mail.example', '+963 933 650 902', 'Syrian', '1975-08-29', 'N0128830'],
  ['Layla', 'Sabbagh', 'layla.sabbagh@mail.example', '+971 50 223 9184', 'Syrian', '1990-10-11', 'N0590412'],
] as const;

export const DESTINATIONS = [
  { name: 'Cappadocia', country: 'Türkiye', city: 'Göreme', description: 'Fairy chimneys, cave hotels and sunrise balloon flights.' },
  { name: 'Petra & Wadi Rum', country: 'Jordan', city: 'Wadi Musa', description: 'The rose city and a night under the desert stars.' },
  { name: 'Dubai', country: 'United Arab Emirates', city: 'Dubai', description: 'Skyline, souks and desert safari.' },
  { name: 'Beirut & Byblos', country: 'Lebanon', city: 'Beirut', description: 'Mediterranean coast, old ports and mountain villages.' },
  { name: 'Istanbul', country: 'Türkiye', city: 'Istanbul', description: 'Two continents, one city: mosques, bazaars and the Bosphorus.' },
  { name: 'Makkah & Madinah', country: 'Saudi Arabia', city: 'Makkah', description: 'Guided Umrah journeys with full support.' },
];

/** offset = days from today to departure; negative means the trip already happened. */
export const TRIPS = [
  { code: 'CAP-01', title: 'Cappadocia Balloon Escape', destination: 'Cappadocia', offset: 9, nights: 4, capacity: 30, price: '890.00', child: '640.00', cost: '610.00', status: 'PUBLISHED', isPublic: true, from: 'Damascus, Al-Abbasiyyin coach station' },
  { code: 'PTR-02', title: 'Petra & Wadi Rum Adventure', destination: 'Petra & Wadi Rum', offset: 16, nights: 3, capacity: 24, price: '540.00', child: '380.00', cost: '360.00', status: 'PUBLISHED', isPublic: true, from: 'Damascus, Al-Abbasiyyin coach station' },
  { code: 'DXB-03', title: 'Dubai Skyline Weekend', destination: 'Dubai', offset: 23, nights: 4, capacity: 20, price: '1150.00', child: '820.00', cost: '840.00', status: 'PUBLISHED', isPublic: true, from: 'Damascus International Airport' },
  { code: 'IST-04', title: 'Istanbul Bosphorus Discovery', destination: 'Istanbul', offset: 34, nights: 5, capacity: 28, price: '960.00', child: '700.00', cost: '650.00', status: 'PUBLISHED', isPublic: true, from: 'Damascus International Airport' },
  { code: 'UMR-05', title: 'Umrah Journey: Spring Group', destination: 'Makkah & Madinah', offset: 48, nights: 10, capacity: 40, price: '1450.00', child: '1100.00', cost: '1120.00', status: 'PUBLISHED', isPublic: true, from: 'Damascus International Airport' },
  { code: 'BEY-06', title: 'Beirut & Byblos Coastal Break', destination: 'Beirut & Byblos', offset: 3, nights: 2, capacity: 18, price: '390.00', child: '260.00', cost: '250.00', status: 'FULL', isPublic: true, from: 'Damascus, Al-Sumariyah station' },
  { code: 'CAP-00', title: 'Cappadocia Autumn Colours', destination: 'Cappadocia', offset: -40, nights: 4, capacity: 30, price: '850.00', child: '600.00', cost: '590.00', status: 'COMPLETED', isPublic: false, from: 'Damascus, Al-Abbasiyyin coach station' },
  { code: 'PTR-00', title: 'Petra Heritage Tour', destination: 'Petra & Wadi Rum', offset: -95, nights: 3, capacity: 24, price: '520.00', child: '360.00', cost: '345.00', status: 'COMPLETED', isPublic: false, from: 'Damascus, Al-Abbasiyyin coach station' },
  { code: 'IST-00', title: 'Istanbul Summer Highlights', destination: 'Istanbul', offset: -150, nights: 5, capacity: 26, price: '920.00', child: '680.00', cost: '640.00', status: 'COMPLETED', isPublic: false, from: 'Damascus International Airport' },
  { code: 'DXB-07', title: 'Dubai New Year Celebration', destination: 'Dubai', offset: 62, nights: 4, capacity: 22, price: '1290.00', child: '900.00', cost: '930.00', status: 'DRAFT', isPublic: false, from: 'Damascus International Airport' },
] as const;

export const ITINERARIES: Record<string, Array<[string, string, string]>> = {
  'CAP-01': [
    ['Departure & arrival in Göreme', 'Coach from Damascus, border crossing, evening check-in at the cave hotel.', 'Göreme'],
    ['Sunrise balloon flight', 'Optional hot-air balloon at dawn, then the Göreme Open-Air Museum.', 'Göreme'],
    ['Underground city & valleys', 'Derinkuyu underground city, Pigeon Valley and a pottery workshop in Avanos.', 'Avanos'],
    ['Uçhisar castle & free afternoon', 'Panoramic views from Uçhisar, free time for shopping.', 'Uçhisar'],
    ['Return journey', 'Breakfast and coach back to Damascus.', 'Damascus'],
  ],
  'PTR-02': [
    ['Damascus to Amman', 'Coach to Amman, city tour of the Citadel and Roman theatre.', 'Amman'],
    ['Petra full day', 'The Siq, the Treasury and the Monastery with a local guide.', 'Petra'],
    ['Wadi Rum', 'Jeep tour, Bedouin dinner and a night in a desert camp.', 'Wadi Rum'],
    ['Return', 'Morning in the desert, then back to Damascus.', 'Damascus'],
  ],
  'DXB-03': [
    ['Arrival', 'Flight to Dubai, transfer and check-in, evening at Dubai Marina.', 'Dubai'],
    ['City tour', 'Burj Khalifa observation deck, Dubai Mall and the fountain show.', 'Downtown Dubai'],
    ['Desert safari', 'Dune drive, camel ride and dinner at a desert camp.', 'Dubai Desert'],
    ['Old Dubai', 'Al Fahidi district, abra ride and the gold and spice souks.', 'Deira'],
    ['Departure', 'Free morning and flight home.', 'Dubai'],
  ],
};

export const HOTELS = [
  { name: 'Kapadokya Stone Cave Hotel', city: 'Göreme', country: 'Türkiye', contact: 'Mehmet Aydın', email: 'reservations@stonecave.example', phone: '+90 384 271 0000', stars: 4, rooms: 42, rate: '95.00', roomTypes: ['Double cave room', 'Family suite'], amenities: ['Breakfast', 'Terrace', 'Wi-Fi'], rating: 5 },
  { name: 'Petra Gate Hotel', city: 'Wadi Musa', country: 'Jordan', contact: 'Rami Nawafleh', email: 'sales@petragate.example', phone: '+962 3 215 0000', stars: 3, rooms: 60, rate: '70.00', roomTypes: ['Double', 'Triple'], amenities: ['Breakfast', 'Restaurant', 'Wi-Fi'], rating: 4 },
  { name: 'Marina View Residences', city: 'Dubai', country: 'United Arab Emirates', contact: 'Aisha Rahman', email: 'groups@marinaview.example', phone: '+971 4 555 0000', stars: 4, rooms: 180, rate: '140.00', roomTypes: ['Studio', 'One-bedroom'], amenities: ['Pool', 'Gym', 'Breakfast'], rating: 4 },
  { name: 'Bosphorus Pearl Hotel', city: 'Istanbul', country: 'Türkiye', contact: 'Elif Demir', email: 'groups@bosphoruspearl.example', phone: '+90 212 555 0000', stars: 4, rooms: 96, rate: '110.00', roomTypes: ['Double', 'Sea-view double'], amenities: ['Breakfast', 'Rooftop', 'Wi-Fi'], rating: 5 },
];

export const TRANSPORTERS = [
  { name: 'Al-Sham Coaches', city: 'Damascus', country: 'Syria', contact: 'Majd Haddad', email: 'booking@alshamcoaches.example', phone: '+963 11 444 0000', vehicle: 'COACH', fleet: 14, seats: 49, rate: '320.00', license: 'TR-DM-2211', rating: 4 },
  { name: 'Levant Minibus Co.', city: 'Damascus', country: 'Syria', contact: 'Samer Aziz', email: 'ops@levantminibus.example', phone: '+963 11 333 0000', vehicle: 'MINIBUS', fleet: 9, seats: 24, rate: '180.00', license: 'TR-DM-3018', rating: 4 },
  { name: 'Desert Line Transfers', city: 'Amman', country: 'Jordan', contact: 'Zaid Qasem', email: 'contact@desertline.example', phone: '+962 6 555 0000', vehicle: 'COACH', fleet: 20, seats: 45, rate: '290.00', license: 'JO-TR-7781', rating: 5 },
  { name: 'Gulf Gate Air Travel', city: 'Dubai', country: 'United Arab Emirates', contact: 'Nadia Farouk', email: 'groups@gulfgate.example', phone: '+971 4 333 0000', vehicle: 'FLIGHT', fleet: null, seats: null, rate: '0.00', license: 'IATA-96-1234', rating: 4 },
] as const;
