# Demo guide (local only)

These accounts exist only in the demo database. `npm run db:setup` or `npm run db:reset` creates it. Every account uses the password **`TakeMeHigh@2026`**.

The fictional office is **سما الشام للسياحة والسفر**, with two branches: Damascus and Aleppo.

| Account | Role | Sees |
|---|---|---|
| `admin@takemehigh.local` | **Admin** | Everything in both branches, including costs, profit, statistics, refunds, roles, integrations and the public page content |
| `manager.damascus@takemehigh.local` | **Branch manager**, Damascus | Damascus trips (own and shared), bookings, customers, payments and staff. No costs, no profit. |
| `employee.damascus@takemehigh.local` | **Employee**, Damascus | Customers, bookings, cash payments and receipts, visas, requests |
| `guide.damascus@takemehigh.local` | **Tour guide**, Damascus | Only the trips assigned to them and their passengers (attendance and notes) |
| `manager.aleppo@takemehigh.local` / `employee.aleppo@takemehigh.local` | Aleppo branch | The same, for Aleppo only. Never sees Damascus bookings. |

Dates are relative to the day you seed, so departures are always in the future.

## What the demo data contains

| Item | What it shows |
|---|---|
| **Latakia, 4 days** (shared, SYP) | The coach example: 200,000 net + 15% = 230,000. The hotel is 450,000 per night × 3 nights + 20%, and the restaurant 150,000 per day × 4 days + 25%. That makes **2,830,000 per person**. Also: 26 of 45 seats confirmed, pending bookings, a Homs boarding point (+25,000), a foreigner with a residence permit, a cancelled booking with a 50% refund, the 10% family discount, and an assigned guide. |
| **Aleppo, old city** (Aleppo branch) | Fully booked (30/30) with 2 bookings on the waiting list |
| **Wadi al-Nasara** | Registration closed with 14 of the minimum 15 passengers. **The Admin must decide.** |
| **Bosra** | Completed and fully paid, which gives realised profit |
| **Palmyra** | A draft with one service only, so it cannot be published yet (BR-04) |
| **Program: Coast and Arwad island** | Damascus → Tartus by land, then Tartus → Arwad by sea and back |
| **Program: Umrah, 8 days** (USD, international) | Flight Damascus → Jeddah, land transport Jeddah → Mecca → Medina → Jeddah, flight back. Passports are required, the visas have several statuses, and an early-booking discount of 50 USD applies. |
| **Bundle offer** | 2 sea-view nights + meals at 15% off, with seats limited to 20 |
| **Suppliers** | The hotel, transport and restaurant platforms sync from the built-in sandbox. Manual companies cover ferries, the airline, Saudi transport, hotels and restaurants. |
| **History** | 11 months of completed trips, for the statistics |
| **Public page** | Slides, achievements with photos, policies, and 3 custom requests (one uses "Other") |

## Suggested 7-minute demo

1. **Public page `/` (visitor):**
   - the slider and the filters by trip type;
   - offers and discounts;
   - "Book now", which opens WhatsApp with a prefilled message;
   - **Design your trip:** pick a hotel and a restaurant, choose sea transport, and write a suggestion under "Other".
2. **Sign in as the Admin:**
   - KPIs per currency;
   - the alerts: a new request, a trip awaiting a decision, missing visas;
   - the 12-month chart.
3. **Trip "Latakia":**
   - the route builder and the price breakdown of the coach example;
   - add a service that "jumps" between cities, and see the refusal (TRP-05).
4. **Program "Coast and Arwad":** the chain of legs (land → sea) and the price, which is the sum of the trips.
5. **Add a customer on Latakia:**
   - create the customer with a Syrian ID;
   - record a partial payment and print the **PDF receipt**;
   - confirm the booking and watch the seats change.
6. **Wadi al-Nasara:** closed below the minimum. **Extend** or **confirm** it.
7. **Integrations:**
   - press **Sync now** on the hotel platform and open the log;
   - **Statistics:** monthly and yearly figures, exported to Excel and PDF.
8. **Sign in as `employee.damascus`:** costs are hidden, and Aleppo data does not exist for this account.
9. **Sign in as `guide.damascus`:** "My trips", the manifest, and attendance.

Reset before presenting: `npm run db:reset`.
