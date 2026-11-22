# Safarni API

- **Base URL:** `http://localhost:3001/api`
- **Interactive docs:** `/api/docs`
- **OpenAPI:** `/api/docs-json` (snapshot in [`openapi.json`](openapi.json), 60 paths)

Swagger is generated from the code, so it is the exact contract. This page is the map.

## Conventions

| Topic | Rule |
|---|---|
| Auth | `POST /auth/login` → `{ accessToken (15 min), refreshToken, user }`. Send `Authorization: Bearer <accessToken>`. On 401, call `POST /auth/refresh { refreshToken }` → new pair; the old refresh token stops working. `POST /auth/logout` revokes the session. |
| Scope | Office and branch come **only** from the token. Unknown body fields (e.g. `officeId`) → 400. Records outside your office or branch scope → **404**. |
| Money | Decimal strings with 2 decimals (`"957500.00"`). Every trip, booking and payment has its own `currencyCode`. Amounts of different currencies are never summed; totals are grouped per currency. |
| Dates | `YYYY-MM-DD` for calendar dates; ISO 8601 UTC timestamps. |
| Lists | `?page&pageSize&search&order=ASC\|DESC` → `{ data, meta: { page, pageSize, total, totalPages } }` |
| Errors | `{ statusCode, error, message, path, timestamp }`. `message` is human-readable (an array for validation errors). 400 rule · 401 auth · 403 permission · 404 not found/out of scope · 409 conflict (seats, duplicates, state) · 429 rate limit |

## Permissions

These are the default roles; each office can edit them or add more (`/roles`).

| Permission | Admin | Reception |
|---|:-:|:-:|
| tours.view · trips.view · customers.view/create/edit · bookings.view/create/edit/confirm/cancel · payments.view/record · reports.view | ✓ | ✓ (own branch) |
| office.manage · branches.manage · employees.manage · roles.manage · audit.view | ✓ | |
| tours.manage · trips.manage · trips.decide · trips.supervise · offers.manage | ✓ | |
| suppliers.view/manage/pay · bookings.transfer · refunds.record · reports.financial | ✓ | |

## Endpoints

### Auth, platform, organisation
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` · `/auth/refresh` · `/auth/logout` | 10/min on login, 30/min on refresh |
| GET | `/auth/me` | user, office, branch, role (scope), permissions |
| GET · POST · PATCH | `/platform/offices[/:id/status]` | Platform admin: onboard an office (main branch, default roles, first admin), (de)activate |
| GET · PATCH | `/office` | Profile, WhatsApp, map location, public page, terms, default currency/language |
| GET · PUT | `/currencies` · `/office/currencies` | Platform currencies; the office's enabled set |
| GET · POST · PATCH | `/branches[/:id]` | Reception sees its own branch only; (de)activation safeguards |
| GET · POST · PATCH | `/employees[/:id]` | One branch + one role; access changes end the employee's sessions |
| GET · POST · PATCH · DELETE | `/roles[/:id]` · GET `/permissions` | Configurable matrix; BRANCH roles can't hold office-wide permissions; the last admin is protected |

### Programs, trips, pricing
| Method | Path | Notes |
|---|---|---|
| CRUD | `/tour-categories` · `/tours` | `PUT /tours/:id/itinerary`, `PUT /tours/:id/images` |
| GET | `/trips` | `branchId, tourId, status, tripType, when=upcoming\|past\|all, search` |
| GET | `/trips/:id` | Services, price breakdown, offers, supervisors, decisions, `financials` (expected profit, collected, supplier dues) |
| POST · PATCH | `/trips[/:id]` | Create from a tour inside one branch; capacity ≥ confirmed seats |
| PUT | `/trips/:id/services` | One supplier per HOTEL/TRANSPORT/RESTAURANT: `{ costPerPerson, profitPercent }` → selling = cost × (1 + %) |
| POST | `/trips/:id/open` · `/unpublish` · `/complete` | Status transitions (open needs priced services) |
| POST | `/trips/:id/decision` | `APPROVE \| EXTEND (newDeadline) \| CANCEL` (cancels all bookings, keeps payments) |
| PUT | `/trips/:id/supervisors` | |
| GET · PATCH | `/trips/:id/passengers[/:pid/attendance]` | Manifest of confirmed passengers; attendance by supervisors |
| GET · POST · PATCH · DELETE | `/trips/:id/offers` · `/offers/:id` | PERCENTAGE or FIXED per person; overlapping active offers → 409 |

### Suppliers
| Method | Path | Notes |
|---|---|---|
| CRUD | `/suppliers[/:id]` | Detail includes dues per trip: cost × confirmed passengers, paid, remaining |
| POST | `/suppliers/:id/payments` | Office → supplier payment in the trip's currency, capped at cost × max seats |
| GET · PUT · POST | `/suppliers/:id/integration[/health]` | Hotel/transport connection settings (secret **name** only); honest health state |

### Customers, bookings, payments
| Method | Path | Notes |
|---|---|---|
| GET · POST · PATCH | `/customers[/:id]` | Unique phone per office (409 names the existing customer); profile with a statement per currency |
| GET | `/bookings` | `status, tripId, customerId, branchId, search` (reference, customer, phone, passenger) |
| GET | `/bookings/:id` | Passengers, payments + refunds, history events, external reservation statuses |
| POST | `/bookings` | `{ tripId, customerId \| customer{…}, passengers[…], confirm?, waitlistIfFull?, payment? }`; prices from the server |
| PATCH | `/bookings/:id` | Notes / passengers (a confirmed booking keeps its count) |
| POST | `/bookings/:id/confirm` · `/waitlist` · `/cancel` · `/transfer` | Seats change atomically; transfer needs the same currency and scope |
| POST | `/bookings/:id/payments` | Cash, `currencyCode` must equal the booking's, ≤ balance |
| GET | `/payments` · `/payments/:id/receipt` · `/refunds` | |
| POST | `/payments/:id/refunds` | ≤ what remains refundable on that payment |

### Dashboard, reports, public pages, ads
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard` | KPIs, upcoming trips, tasks, recent bookings; `finance` per currency for `reports.financial` |
| GET | `/reports/:type` | `bookings`, `upcoming-trips`, `passengers (tripId)`, `customer-statement (customerId)`, `payments*`, `refunds*`, `trip-profit*` (*financial). `format=xlsx&lang=ar\|en` downloads Excel |
| CRUD | `/banners[/:id]` | Ads for the moving strip (`offers.manage`) |
| GET | `/public/showcase` | No auth. Published trips of offices with a public page; filters `destination, category, tripType, from, to, offersOnly, search`; `banners`, `facets` |
| GET | `/public/offices/:slug` · `/public/offices/:slug/trips/:tripId` | Office page (location, branches, trips, ads) and trip page; `whatsappUrl` with a prefilled message |
