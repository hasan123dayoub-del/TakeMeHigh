// Static sample data for the Design Lab previews only. Not real business data.

export type BookingStatus = "Confirmed" | "Pending" | "Cancelled";
export type PaymentStatus = "Paid" | "Partial" | "Refunded";

export type SampleBooking = {
  ref: string;
  customer: string;
  trip: string;
  date: string;
  pax: number;
  total: string;
  status: BookingStatus;
  payment: PaymentStatus;
};

export const BOOKINGS: SampleBooking[] = [
  { ref: "TRV-2417", customer: "Layla Haddad", trip: "Cappadocia Balloon Escape", date: "14 Dec", pax: 2, total: "$3,180", status: "Confirmed", payment: "Paid" },
  { ref: "TRV-2416", customer: "Omar Nasser", trip: "Petra & Wadi Rum", date: "19 Dec", pax: 4, total: "$5,640", status: "Pending", payment: "Partial" },
  { ref: "TRV-2415", customer: "Sofia Marques", trip: "Dubai Skyline Weekend", date: "21 Dec", pax: 2, total: "$2,290", status: "Confirmed", payment: "Partial" },
  { ref: "TRV-2414", customer: "James Whitfield", trip: "Santorini Sunset Week", date: "03 Jan", pax: 2, total: "$4,870", status: "Cancelled", payment: "Refunded" },
  { ref: "TRV-2413", customer: "Aiko Tanaka", trip: "Marrakech Riad Retreat", date: "09 Jan", pax: 3, total: "$3,960", status: "Confirmed", payment: "Paid" },
];

export const EXTRA_BOOKINGS: SampleBooking[] = [
  { ref: "TRV-2412", customer: "Karim Mansour", trip: "Istanbul Bosphorus Stay", date: "11 Jan", pax: 2, total: "$1,940", status: "Pending", payment: "Partial" },
  { ref: "TRV-2411", customer: "Elena Rossi", trip: "Petra & Wadi Rum", date: "19 Dec", pax: 2, total: "$2,820", status: "Confirmed", payment: "Paid" },
  { ref: "TRV-2410", customer: "Noah Becker", trip: "Cappadocia Balloon Escape", date: "14 Dec", pax: 1, total: "$1,590", status: "Cancelled", payment: "Refunded" },
];

export const KPIS = [
  { key: "revenue", label: "Revenue", value: "$184,320", delta: "+12.4%", note: "vs last month", up: true },
  { key: "bookings", label: "Bookings", value: "1,248", delta: "+8.1%", note: "vs last month", up: true },
  { key: "seats", label: "Seats available", value: "312", delta: "18 trips", note: "next 60 days", up: true },
  { key: "outstanding", label: "Outstanding", value: "$23,780", delta: "14 invoices", note: "3 overdue", up: false },
] as const;

export const SERIES = [
  { key: "tours", label: "Tours" },
  { key: "flights", label: "Flights" },
  { key: "hotels", label: "Hotels" },
  { key: "transfers", label: "Transfers" },
  { key: "visas", label: "Visas" },
] as const;

export const BOOKINGS_BY_MONTH = [
  { month: "Jul", tours: 82, flights: 64, hotels: 48, transfers: 22, visas: 12, target: 210 },
  { month: "Aug", tours: 96, flights: 71, hotels: 55, transfers: 26, visas: 14, target: 230 },
  { month: "Sep", tours: 74, flights: 58, hotels: 46, transfers: 20, visas: 11, target: 220 },
  { month: "Oct", tours: 88, flights: 66, hotels: 52, transfers: 25, visas: 16, target: 235 },
  { month: "Nov", tours: 104, flights: 79, hotels: 61, transfers: 30, visas: 18, target: 250 },
  { month: "Dec", tours: 118, flights: 86, hotels: 70, transfers: 34, visas: 21, target: 270 },
];

export const REVENUE_BY_MONTH = [
  { month: "Jan", revenue: 98, last: 84 },
  { month: "Feb", revenue: 104, last: 88 },
  { month: "Mar", revenue: 121, last: 97 },
  { month: "Apr", revenue: 132, last: 110 },
  { month: "May", revenue: 128, last: 118 },
  { month: "Jun", revenue: 151, last: 126 },
  { month: "Jul", revenue: 168, last: 139 },
  { month: "Aug", revenue: 176, last: 151 },
  { month: "Sep", revenue: 149, last: 133 },
  { month: "Oct", revenue: 158, last: 140 },
  { month: "Nov", revenue: 184, last: 162 },
  { month: "Dec", revenue: 196, last: 171 },
];

export const DEPARTURES = [
  { date: "14 Dec", time: "05:30", trip: "Cappadocia Balloon Escape", from: "Göreme, Türkiye", sold: 18, seats: 24, guide: "Murat K.", done: true },
  { date: "19 Dec", time: "08:00", trip: "Petra & Wadi Rum", from: "Amman, Jordan", sold: 21, seats: 26, guide: "Rana S.", done: true },
  { date: "21 Dec", time: "16:45", trip: "Dubai Skyline Weekend", from: "Dubai, UAE", sold: 9, seats: 20, guide: "Yousef A.", done: false },
  { date: "09 Jan", time: "11:15", trip: "Marrakech Riad Retreat", from: "Marrakech, Morocco", sold: 6, seats: 16, guide: "Salma B.", done: false },
];
