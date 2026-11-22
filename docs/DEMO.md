# Demo guide (local only)

These accounts exist only in the local demo database created by `npm run db:setup` (or `db:reset`). All of them use the password **`Safarni@2026`**.

| Account | Role | Sees |
|---|---|---|
| `admin@sham-travel.safarni.local` | **Admin**, شام للسياحة والسفر (Sham Travel) | Everything in both branches: finance, profit, refunds, staff, roles, settings |
| `reception.damascus@sham-travel.safarni.local` | **Reception**, Damascus branch | Customers, bookings, cash payments, operational reports, all for Damascus only. No refunds, no profit, no settings. |
| `reception.aleppo@sham-travel.safarni.local` | **Reception**, Aleppo branch | The same, for Aleppo only. Cannot see or book Damascus trips. |
| `admin@coast-tours.safarni.local` | **Admin**, رحلات الساحل (Coast Tours) | Another office. Never sees Sham Travel's data. |
| `platform@safarni.local` | Safarni platform admin | Office onboarding and activation only |

## What the demo data contains

Dates are relative to the day you seed, so departures are always in the future.

| Trip | What it shows |
|---|---|
| **DL-STD-01** دمشق – اللاذقية (Standard, SYP) | The coach example from the brief: transport **200,000 → 230,000** (+15%), hotel 450,000 (+20%), restaurant 150,000 (+25%), so **957,500 per person**. It has a 10% family offer, 26/45 seats confirmed, pending bookings that take no seats, a partial advance already paid to the coach company, and a cancelled booking with a 50% refund. |
| **DL-VIP-01** (VIP, **USD**) | The same program at VIP level, priced in dollars, with a fixed per-person offer |
| **ALP-01** حلب القديمة (Aleppo branch) | **Fully booked** (30/30) with 2 bookings on the **waiting list** |
| **WN-01** وادي النصارى | Registration closed with 14 of the minimum 15 passengers: **waiting for the admin's decision** |
| **BS-01** بصرى | **Completed**, suppliers fully paid: expected profit = realised profit = 712,500 SYP |
| **ALP-02** | Draft (not public) |
| **AR-01** (Coast Tours) | Another office's public trip (isolation and showcase) |

## Suggested 6-minute demo

1. **Showcase (`/`)**, the visitor's view:
   - moving ads
   - filters (Latakia, VIP, offers only)
   - each trip shows its office
   - open a trip, then the **WhatsApp** button opens a prefilled message
   - open the office page to see the **map**
2. **Login as Admin, then the dashboard:**
   - KPIs, plus trips waiting for a decision
   - money in **SYP and USD side by side**
   - expected profit against realised profit
3. **Trip DL-STD-01:**
   - the **price breakdown** (the coach example)
   - offers
   - supplier dues: owed, paid, remaining
   - the passenger list
4. **New booking:**
   - pick the trip and a customer
   - add each passenger
   - confirm, which takes the seats
   - take a cash payment and print the receipt and confirmation
5. **No overbooking:**
   - try to confirm a waiting-list booking on the full Aleppo trip: the clear "fully booked" message
   - mention the automated test where 25 simultaneous confirmations on 10 seats produce exactly 10
6. **Decision:** approve or extend trip WN-01, which has 14 of its minimum 15 passengers.
7. **Isolation:**
   - log in as Aleppo reception: no Damascus trips, no profit, no settings
   - the API answers 404 for other branches' ids
8. **Reports:**
   - trip profit report: export to **Excel**, print to **PDF**
   - switch to **English**: the whole layout mirrors

## Reset before presenting

```powershell
npm run db:reset
```
