# TravelOS API contract

Base URL: `http://localhost:3001/api` · Interactive docs: `http://localhost:3001/api/docs` · Raw OpenAPI: `/api/docs-json`

The Swagger page is generated from the code, so it is always the exact contract. This page is the quick map.

## Conventions

| Topic | Rule |
|---|---|
| Auth | `POST /auth/login` → `accessToken` (JWT, 8h). Send `Authorization: Bearer <token>` on every other call. |
| Tenancy | The agency always comes from the token. Sending `agencyId` in a body is rejected (400). Records of another agency answer 404. |
| Money | Strings with 2 decimals, e.g. `"1250.00"`. Never floats. Currency comes from `agency.currency`. |
| Dates | `YYYY-MM-DD` for calendar dates (trips, expenses); ISO 8601 UTC for timestamps. |
| Lists | `?page=1&pageSize=20&search=&order=DESC` → `{ data: [...], meta: { page, pageSize, total, totalPages } }` |
| Errors | `{ statusCode, error, message, path, timestamp }`. `message` is a string or a list of validation messages. |
| Status codes | 400 validation / business rule · 401 not signed in · 403 role not allowed · 404 not found (or other agency) · 409 conflict (no seats, duplicate, state) · 429 rate limit |

## Roles

| Permission | Owner | Admin | Ops manager | Booking agent | Accountant |
|---|:-:|:-:|:-:|:-:|:-:|
| trips.read / bookings.read / customers.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| trips.write | ✓ | ✓ | ✓ | | |
| bookings.write / customers.write | ✓ | ✓ | ✓ | ✓ | |
| payments.write (record a payment) | ✓ | ✓ | | ✓ | ✓ |
| suppliers.read | ✓ | ✓ | ✓ | | ✓ |
| suppliers.write | ✓ | ✓ | ✓ | | |
| finance.read / finance.write (refunds, expenses) | ✓ | ✓ | | | ✓ |
| reports.read | ✓ | ✓ | ✓ | | ✓ |
| users.manage / settings.manage | ✓ | ✓ | | | |

Source of truth: `packages/shared/src/index.ts` (`PERMISSIONS`, `can()`), used by both API and web.

## Endpoints

### Auth & agency
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, user }`. 10 req/min. |
| GET | `/auth/me` | Current user + agency |
| GET / PATCH | `/agency` | Profile + `settings` (public page, deposit %, balance due days, terms) |
| GET / POST | `/users` | Team members |
| PATCH | `/users/:id` | Role / active. The last active owner cannot be removed. |

### Trips (programs & offers)
| Method | Path | Notes |
|---|---|---|
| GET | `/trips` | `status`, `destinationId`, `when=upcoming\|past\|all`, `search`. Each trip has `seatsAvailable`, `occupancy`, `activeOffer`, `currentPrice`. |
| GET | `/trips/options` | Compact list for selects |
| GET | `/trips/:id` | + `itinerary`, `suppliers` (services with costs), `financials` |
| POST / PATCH / DELETE | `/trips[/:id]` | Capacity can't go below seats booked (409). Delete only without bookings. Offer: `offerPrice` (< price), `offerLabel`, `offerEndsAt`. |
| PUT | `/trips/:id/itinerary` | `{ days: [{ dayNumber, title, description, location }] }` |
| POST / DELETE | `/trips/:id/suppliers[/:tripSupplierId]` | `{ supplierId, service, quantity, unitCost }` |
| GET / POST | `/destinations` | |

### Bookings
| Method | Path | Notes |
|---|---|---|
| GET | `/bookings` | `status`, `paymentStatus`, `tripId`, `customerId`, `source`, `search` (reference, name, phone, trip) |
| GET | `/bookings/:id` | + trip, customer (passport masked), passengers, payments, refunds, `balance` |
| GET | `/bookings/:id/confirmation` | Data for the printable confirmation |
| POST | `/bookings` | `{ tripId, customerId \| customer{...}, adults, children?, discount?, passengers?, notes?, specialRequests?, payment?{amount,method}, confirm? }`. Prices computed on the server. **409 when seats run out.** |
| PATCH | `/bookings/:id` | notes, specialRequests, passengers (count must equal seats) |
| POST | `/bookings/:id/confirm` | PENDING → CONFIRMED |
| POST | `/bookings/:id/cancel` | `{ reason, refund?{amount,method} }` releases seats (FULL trip reopens) |
| POST | `/bookings/:id/payments` | `{ amount, method, reference?, paidAt?, notes? }`. Can't exceed balance. Reaching the deposit % confirms a pending booking. |
| POST | `/bookings/:id/refunds` | `{ amount, method, reason }`. Can't exceed what was paid. |

### Customers & suppliers
| Method | Path | Notes |
|---|---|---|
| GET | `/customers` | With `stats` (bookings, totalSpent, outstanding, lastTrip). Passport masked. |
| GET | `/customers/:id` | + bookings, payments, stats. Passport visible only to roles with customers.write. |
| POST / PATCH / DELETE | `/customers[/:id]` | Duplicate email/phone → 409 with the existing name |
| GET | `/suppliers` | `type=HOTEL\|TRANSPORT\|GUIDE\|OTHER`, with `hotel` / `transport` details and `usage` |
| GET | `/suppliers/:id` | + services per trip, committed vs paid |
| POST / PATCH / DELETE | `/suppliers[/:id]` | `hotel{...}` or `transport{...}` details by type |

### Finance, dashboard, reports
| Method | Path | Notes |
|---|---|---|
| GET | `/finance/summary` | collected, refunded, netRevenue, expenses, profit, outstanding, this month |
| GET | `/finance/payments` · `/finance/refunds` | `from`, `to`, `method`, `search` |
| GET / POST / PATCH / DELETE | `/finance/expenses[/:id]` | `category`, `tripId`, `supplierId`, `from`, `to` |
| GET | `/dashboard` | `kpis`, `upcomingDepartures`, `revenueByMonth` (12 months), `bookingTrend` (weekly), `bookingsByStatus`, `recentActivity` |
| GET | `/reports?from&to` | `totals`, `revenueByPeriod`, `popularTrips`, `seatUtilization`, `outstandingBalances` (with `dueDate`, `overdue`), `tripProfitability`, `expensesByCategory`, `bookingSources`, `paymentMethods` |

### Public agency page (no auth)
| Method | Path | Notes |
|---|---|---|
| GET | `/public/agencies/:slug` | Agency branding + public upcoming trips with `seatsAvailable`, `offer` |
| GET | `/public/agencies/:slug/trips/:tripSlug` | + description, inclusions, itinerary |
| POST | `/public/agencies/:slug/trips/:tripSlug/booking-requests` | `{ firstName, lastName, phone, email?, adults, children?, message? }` → holds seats as a PENDING booking. 5 req/min. |

Demo agency slug: `horizon-travel`.
