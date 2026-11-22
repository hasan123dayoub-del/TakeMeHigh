# Software Requirements Specification: Safarni (سفرني)

| | |
|---|---|
| Product | Safarni, a multi-tenant SaaS for managing tourism offices |
| Version | 0.2 (hackathon release) |
| Sources | Official brief from the organisers; Master Project Context; owner decisions (2 default roles, showcase landing, supplier dues) |
| Status legend | ✅ implemented and verified · 🟡 foundation only · ⏳ open decision (see [OPEN-DECISIONS](../OPEN-DECISIONS.md)) |

## 1. Introduction

### 1.1 Purpose and scope
Safarni is an integrated web system that runs a tourism office from the inside. It covers:
- programs (tours) and offers
- prices built from supplier costs plus profit
- bookings with individual passenger records
- customers
- suppliers (hotels, transport, restaurants) and the office's dues to them
- available seats

All of this is in one dashboard. Each office may enable a public page, and appear on the Safarni showcase, where travellers browse its ready trips and contact it on WhatsApp.

**Not in scope:**
- a central marketplace, online checkout, customer accounts, or a mobile app
- full accounting (salaries, general expenses)

### 1.2 Definitions
| Term | Meaning |
|---|---|
| Office | A tenant (tourism office). Its data is fully isolated from other offices. |
| Branch | An organisational unit inside an office. Every employee belongs to exactly one branch. |
| Tour | A reusable program (itinerary, terms, images). |
| Trip | A scheduled run of a Tour in one branch, with dates, a type (VIP or Standard), a currency, capacity and prices. |
| Service | A hotel, transport or restaurant supplier attached to a trip, with its cost per person and profit %. |
| Seats taken | The passengers of **CONFIRMED** bookings only. |

### 1.3 Users
| Class | Description |
|---|---|
| Platform admin | Safarni staff: onboards, activates and deactivates offices |
| Admin (default role, office scope) | Manages the whole office: all branches, staff, roles, prices, decisions, refunds, profit |
| Reception (default role, branch scope) | Front desk of one branch: customers, bookings, passengers, cash payments, operational reports |
| Custom roles | Offices can compose roles from the permission catalogue (e.g. trip supervisor) |
| Visitor | Browses the public pages; contacts the office on WhatsApp |

### 1.4 Environment and constraints
- **Software:** Node.js 22+, PostgreSQL 16+ (developed on 18), modern browsers from 375 px wide.
- **Languages:** Arabic (RTL, default) and English (LTR).
- **Market:** initially Syria (SYP and USD), with the architecture ready for other countries and currencies.

## 2. Functional requirements

V = verification. **T** = automated e2e test (`apps/api/test`). **D** = demonstrated in the UI. **R** = code review.

### 2.1 Identity, tenancy, permissions
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-1 | Login with email and password. 15-minute access token plus a rotating refresh token. Logout revokes the session. Reusing an old refresh token revokes the whole session. | ✅ | T |
| FR-2 | An office never accesses another office's data; other offices' ids answer 404. | ✅ | T |
| FR-3 | A branch-scoped employee only sees and acts on their branch's trips, bookings and payments, and cannot book another branch's trip. | ✅ | T |
| FR-4 | Roles are configurable per office from a permission catalogue. The default roles are Admin and Reception. Branch roles cannot hold office-wide permissions. The office always keeps an administrator. | ✅ | T |
| FR-5 | The platform admin onboards an office (main branch, default roles, first admin) and can activate or deactivate it. | ✅ | T |
| FR-6 | Employees are created in exactly one branch with one role. Changing their access ends their sessions. | ✅ | T |

### 2.2 Office, branches, currencies
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-7 | Office profile: WhatsApp number, map location, logo, brand colour, terms, default currency and language, public page on/off. | ✅ | T |
| FR-8 | Branches can be created, updated and (de)activated with safeguards (main branch, active staff, active trips). | ✅ | T |
| FR-9 | SYP and USD are supported, with each office's enabled set and default. Each trip uses one currency; its bookings and payments inherit it. No conversion. | ✅ | T |

### 2.3 Tours and trips
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-10 | Tour categories per office; tours with itinerary, images, accommodation/transport info, terms, and an active flag. | ✅ | R, D |
| FR-11 | Trips are created from tours, in one branch, VIP **or** Standard, with dates, minimum passengers, maximum seats, registration deadline and supervisors. | ✅ | T |
| FR-12 | Registration closes automatically at the (extended) deadline. The admin then decides: **approve / extend / cancel**. Decisions are recorded with the confirmed count against the minimum. Cancelling a trip cancels its bookings and keeps their payments. | ✅ | T |
| FR-13 | Passenger manifest per trip; supervisors record attendance. | ✅ | R, D |

### 2.4 Pricing, offers, supplier dues
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-14 | One supplier per service type per trip. Each service has a cost per person and its own profit %. **Selling = cost × (1 + profit%)**. The trip price is the sum. | ✅ | T |
| FR-15 | A trip can only open registration with at least one priced service. | ✅ ⏳ | T |
| FR-16 | Offers apply to the whole trip: percentage or fixed (per person), with a period and an active flag. A discount can never exceed the price. Overlapping active offers are refused. | ✅ ⏳ | T |
| FR-17 | Supplier dues per trip = cost × confirmed passengers, plus office→supplier payments, plus the remaining balance. | ✅ | T |

### 2.5 Customers, bookings, passengers, seats
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-18 | Customers are office-wide (unique phone): search by name, phone, national ID or passport; booking history; a statement per currency. | ✅ | T |
| FR-19 | Bookings are created by staff with **one record per passenger**. The passenger count equals the number of records. | ✅ | T |
| FR-20 | Booking totals are computed on the server from the trip price and the active offer, and frozen as a snapshot. Later price changes never alter existing bookings. | ✅ | T |
| FR-21 | **Only CONFIRMED bookings take seats.** Pending and waiting-list bookings don't. Cancelling releases seats. Confirmation never exceeds capacity, **including concurrent requests**. | ✅ | T |
| FR-22 | Statuses: Pending, Confirmed, Waiting list, Cancelled, with a recorded history of every change. | ✅ | T |
| FR-23 | A booking can be transferred to another trip in the same scope and currency, with re-pricing. The old price is kept in its history. | ✅ | T |
| FR-24 | Printable booking confirmation. | ✅ | D |

### 2.6 Payments and refunds
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-25 | Multiple cash payments per booking, in the booking's currency, never above the balance; receipt numbers and printable receipts. | ✅ | T, D |
| FR-26 | Manual refunds are linked to the original payment (partial allowed), never above what remains refundable. Payment history is never deleted. | ✅ | T |

### 2.7 Dashboard, reports, public pages
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-27 | Dashboard: bookings, upcoming trips, confirmed passengers, available seats, tasks. For financial roles: collected, outstanding, **expected vs realised profit per currency**. | ✅ | T, D |
| FR-28 | Reports: bookings, upcoming trips, passenger list, customer statement, payments, refunds, trip pricing & profit. Excel export (RTL) and print-to-PDF. | ✅ | T, D |
| FR-29 | Public showcase: published trips of offices with a public page, moving ads, filters (destination, category, date, type, offers), the owning office, its location and WhatsApp. There is no booking record and no checkout. | ✅ | T, D |
| FR-30 | Office page (location, branches, trips, ads) and trip page (itinerary, price, seats, WhatsApp "Book now" with a prefilled message). A disabled page answers 404. | ✅ | T, D |

### 2.8 Supplier integrations (hotel and transport systems)
| ID | Requirement | Status | V |
|---|---|---|---|
| FR-31 | Connection settings per hotel/transport supplier. Secrets are referenced by name only and never returned. Restaurants are manual. | 🟡 | T |
| FR-32 | External reservations are separate from internal bookings: their own statuses, partial success, reconciliation of uncertain outcomes, duplicate prevention. | 🟡 data model + client; adapters wait for the API docs | R |

## 3. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 Security | bcrypt; rotating refresh tokens; RBAC on every route; office and branch scope from the token; whitelisted DTO validation; rate limits; Helmet; CORS; no secrets in responses or logs; public data minimised. |
| NFR-2 Integrity | CHECK constraints (seats, prices, discounts, refunds); composite foreign keys preventing cross-office links; multi-step operations in transactions; audit log in the same transaction. |
| NFR-3 Money | `NUMERIC(14,2)` and decimal.js. No floats. Never sum different currencies. |
| NFR-4 Performance | Paginated lists; indexes led by `office_id` / `branch_id`; aggregate SQL for the dashboard and reports (no N+1). |
| NFR-5 Usability | Arabic RTL and English LTR with a true mirrored layout; responsive from 375 px; light and dark themes (WCAG AA measured); loading, empty and error states; human-readable errors. |
| NFR-6 Maintainability | TypeScript end to end; modular NestJS; Prisma migrations; shared permission catalogue; 40 e2e tests; lint clean. |
| NFR-7 Portability | Any machine with Node.js and PostgreSQL; configuration in `.env` (`.env.example` provided). |

## 4. Traceability

The e2e suites (`npm run test:e2e`, 40 tests) cover the requirements as follows:

| Suite | Requirements |
|---|---|
| `auth.e2e-spec.ts` | FR-1 |
| `organization.e2e-spec.ts` | FR-2, FR-4, FR-5, FR-6, FR-8 |
| `bookings.e2e-spec.ts` | FR-3, FR-11, FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, FR-21, FR-22, FR-23, FR-25, FR-26 |
| `reports-public.e2e-spec.ts` | FR-7, FR-9, FR-17, FR-18, FR-27, FR-28, FR-29, FR-30, FR-31 |

## 5. Roadmap

1. Hotel and transport adapters, built once their API documentation and sandbox credentials are provided.
2. File uploads for images (URLs today).
3. Subscription plans and billing for offices.
4. WhatsApp and SMS reminders for balances and departures.
5. httpOnly cookie sessions and two-factor authentication.
6. Scheduled jobs (deadline notifications) and backups.
