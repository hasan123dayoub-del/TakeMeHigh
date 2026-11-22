# Demo guide (local only)

These accounts exist only in the local demo database created by `pnpm db:reset`. They are not real credentials.

Agency: **Horizon Travel & Tours** (Damascus) · public page slug `horizon-travel`

| Role | Email | Sees |
|---|---|---|
| Owner | `owner@demo.travelos.local` | Everything, team and settings |
| Administrator | `admin@demo.travelos.local` | Everything; cannot create owners |
| Operations manager | `ops@demo.travelos.local` | Trips, bookings, customers, suppliers, reports |
| Booking agent | `agent@demo.travelos.local` | Trips, bookings, customers, record payments. No finance, reports or suppliers. |
| Accountant | `accounts@demo.travelos.local` | Finance, refunds, expenses, reports, suppliers (read) |

Password for all demo accounts: `TravelOS@2026`

## What the demo data contains

Dates are relative to the day you run the seed, so departures are always in the future.

- 10 trips: 6 upcoming (one **fully booked** in 3 days), 3 completed, 1 draft.
- 3 active **offers**: a last-minute deal, an early bird and a family special.
- 70+ bookings in every state:
  - pending, confirmed, completed and cancelled
  - two cancellations with refunds
  - deposits only, fully paid, and **overdue balances**
- 12 customers, 4 hotels, 4 transport companies and 1 guide, linked to trips with real costs.
- Six months of payments and expenses, so the charts and the profit report have history.

## Reset before presenting

```powershell
pnpm db:reset
```

## Suggested 5-minute demo flow

1. **Dashboard (owner).** Revenue this month, outstanding balances, overdue bookings, upcoming departures, recent activity.
2. **Trips.** Open "Cappadocia Balloon Escape":
   - itinerary
   - suppliers and their costs
   - booked value against projected margin
   - the active last-minute offer
3. **New booking.** Book 2 adults and 1 child for a new customer:
   - the price comes from the server (offer applied)
   - take the 30% deposit, which confirms the booking automatically
   - print the confirmation
4. **Overbooking protection.** Try to book 3 seats on a trip with 2 left: a clear "Only 2 seats left" message. Then mention the automated test: 25 simultaneous requests on 10 seats produce exactly 10 bookings.
5. **Cancel with refund.** Cancel a booking with a partial refund. The seats return to the trip and a full trip reopens.
6. **Roles.** Sign in as the booking agent: Finance, Reports and Settings are gone, and the API refuses them (403).
7. **Public page.** Open `/a/horizon-travel`:
   - the agency's own branded page with live availability and offers
   - a traveller request appears instantly as a pending booking in the office
8. **Reports.** Trip profitability, seat utilization, outstanding balances with due dates.
