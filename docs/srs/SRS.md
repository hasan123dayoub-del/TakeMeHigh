# Software Requirements Specification: TravelOS

| | |
|---|---|
| Product | TravelOS, Travel Agency Operations System |
| Version | 0.1 (hackathon release) |
| Event | ByteForFuture × AFK Hackathon 2026 |
| Status | Implemented; requirements marked ✅ are implemented and verified |

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements of TravelOS. It is written for the development team, the hackathon judges and future maintainers.

### 1.2 Scope
TravelOS is an integrated web system that runs a travel agency from the inside. It covers:
- programs and offers
- prices
- bookings
- customers
- suppliers (hotels and transport)
- available seats

All of this lives in one dashboard. Each agency can also have an optional public page where it publishes its ready trips so travellers can book directly.

**Out of scope:** TravelOS is not a central travel marketplace. Its goal is to replace notebooks, WhatsApp and Word files with a daily operating tool for each agency. Online card payment, airline and hotel inventory integrations, and multi-currency accounting are out of scope for this release (see §8 Roadmap).

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Agency (tenant) | A travel agency using TravelOS; all its data is isolated from other agencies |
| Trip (program) | A dated, priced travel package with a fixed capacity |
| Offer | A time-limited reduced adult price on a trip |
| Booking | A reservation of seats on a trip for a customer |
| Seats booked | Seats held by Pending, Confirmed and Completed bookings |
| Deposit % | Share of the total that confirms a booking (agency setting, default 30%) |
| Balance due | Deposit and remaining balance due N days before departure (agency setting, default 7) |

### 1.4 References
- [Architecture](../architecture/README.md)
- [Database](../database/README.md)
- [API contract](../api/README.md)
- [Use cases](../use-cases/README.md)
- [Design system](../design/design-system.md)

## 2. Overall description

### 2.1 Product perspective
TravelOS is a stand-alone multi-tenant web application:
- a browser client (Next.js),
- a REST API (NestJS),
- a relational database (MariaDB/MySQL).

The public agency page is part of the same web app and uses a restricted set of public endpoints.

### 2.2 User classes
| Class | Permissions (summary) |
|---|---|
| Owner | Everything, including team management and owner accounts |
| Administrator | Everything except managing owners |
| Operations Manager | Trips, offers, itineraries, suppliers, bookings, customers, reports |
| Booking Agent | Trips (read), bookings, customers, record payments |
| Accountant | Read operations, payments, refunds, expenses, finance, reports |
| Traveller | Public page only, no account |

### 2.3 Operating environment
- **Server:**
  - Node.js 22+
  - MariaDB 10.4 (XAMPP) or MySQL 8
  - Windows (the team's environment); Linux and macOS are compatible
- **Client:**
  - current Chrome, Edge, Firefox or Safari on desktop, tablet or phone (from 375 px wide)
  - light and dark themes

### 2.4 Constraints
- 24-hour build by a team of 5, so a modular monolith was chosen.
- Runs locally from XAMPP with no Docker requirement.
- No source code is published or deployed during the event.

### 2.5 Assumptions
- One currency per agency.
- Staff are trusted within their role.
- Travellers' booking requests are confirmed by the agency by phone or WhatsApp.

## 3. Functional requirements

Priority: **M** = must, **S** = should. Verification: **T** = automated test, **D** = demonstrated in the UI, **R** = code review.

### 3.1 Authentication and authorisation
| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-AUTH-1 | Staff sign in with email and password and receive a JWT valid for 8 hours. | M | ✅ | T |
| FR-AUTH-2 | Passwords are stored as bcrypt hashes and never returned by the API. | M | ✅ | R |
| FR-AUTH-3 | Every endpoint except login, health and the public page requires a valid token. | M | ✅ | T |
| FR-AUTH-4 | Every action is authorised against the role permission matrix; unauthorised actions return 403. | M | ✅ | T |
| FR-AUTH-5 | All data access is scoped to the agency in the token; other agencies' records return 404. | M | ✅ | T |
| FR-AUTH-6 | The UI hides navigation and actions the role cannot use. | S | ✅ | D |

### 3.2 Dashboard
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DASH-1 | Show total and active trips, total and pending bookings, available seats, revenue (this month against last), outstanding balance and overdue bookings. | M | ✅ |
| FR-DASH-2 | Show upcoming departures with seats booked out of capacity. | M | ✅ |
| FR-DASH-3 | Show revenue by month (12 months), the weekly booking trend and bookings by status. | S | ✅ |
| FR-DASH-4 | Show recent activity from the audit log. | S | ✅ |
| FR-DASH-5 | All figures come from live data; none are hard-coded. | M | ✅ |

### 3.3 Trips, programs and offers
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-TRIP-1 | Create, edit, list, filter (status, destination, upcoming/past) and search trips. | M | ✅ |
| FR-TRIP-2 | A trip has a code, title, destination, departure and return dates, capacity, adult and child prices, cost per person, status, public flag, inclusions and exclusions. | M | ✅ |
| FR-TRIP-3 | Maintain a day-by-day itinerary. | M | ✅ |
| FR-TRIP-4 | Attach supplier services with quantity and unit cost; show the projected margin. | S | ✅ |
| FR-TRIP-5 | Define an offer (price below the normal price, label, optional end date). The active offer applies automatically to new bookings and the public page. | M | ✅ |
| FR-TRIP-6 | Capacity cannot be reduced below the seats already booked. | M | ✅ |
| FR-TRIP-7 | A trip with bookings cannot be deleted; it can be cancelled. | M | ✅ |
| FR-TRIP-8 | A trip becomes FULL automatically when no seats remain, and reopens when seats are released. | M | ✅ |

### 3.4 Bookings and seats
| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-BOOK-1 | Create a booking for an existing or new customer with adults, children, optional discount, passengers and notes. | M | ✅ | T |
| FR-BOOK-2 | Prices and totals are computed by the server from the trip (including offers), never from the client. | M | ✅ | T |
| FR-BOOK-3 | **Seats are never oversold, including under simultaneous requests.** | M | ✅ | T (25 concurrent requests on 10 seats → 10 bookings) |
| FR-BOOK-4 | A request larger than the seats left is rejected with the number of seats left. | M | ✅ | T |
| FR-BOOK-5 | Bookings can be confirmed and cancelled. Cancellation releases seats and can include a refund in the same transaction. | M | ✅ | T |
| FR-BOOK-6 | Each booking has a unique readable reference (TOS-YY-XXXXXX). | M | ✅ | T |
| FR-BOOK-7 | List, filter (status, payment status, trip, customer, source) and search bookings. | M | ✅ | D |
| FR-BOOK-8 | Generate a printable booking confirmation. | M | ✅ | D |
| FR-BOOK-9 | Record the booking source (office, phone, WhatsApp, public page). | S | ✅ | R |

### 3.5 Payments and finance
| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-FIN-1 | Record payments (amount, method, reference, date) against a booking. | M | ✅ | T |
| FR-FIN-2 | A payment cannot exceed the remaining balance; a refund cannot exceed the amount paid. | M | ✅ | T |
| FR-FIN-3 | Reaching the agency's deposit % confirms a pending booking automatically. | S | ✅ | T |
| FR-FIN-4 | Payment status is derived: Unpaid, Partial, Paid or Refunded. | M | ✅ | T |
| FR-FIN-5 | Record, edit and delete expenses by category, optionally linked to a trip or supplier. | M | ✅ | D |
| FR-FIN-6 | Show collected, refunded, net revenue, expenses, profit and outstanding totals. | M | ✅ | D |
| FR-FIN-7 | All money uses exact decimal arithmetic. | M | ✅ | R, T |

### 3.6 Customers
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-CUS-1 | Create, edit, search and delete customers (delete only without bookings). | M | ✅ |
| FR-CUS-2 | The profile shows booking history, payment history, totals and outstanding balance. | M | ✅ |
| FR-CUS-3 | Duplicate email or phone within the agency is rejected with the existing customer's name. | S | ✅ |
| FR-CUS-4 | Passport numbers are masked except for roles allowed to edit customers. | M | ✅ |
| FR-CUS-5 | Internal notes and tags (e.g. VIP). | S | ✅ |

### 3.7 Suppliers
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SUP-1 | Manage hotels (stars, rooms, nightly rate, room types, amenities, check-in and check-out). | M | ✅ |
| FR-SUP-2 | Manage transport companies (vehicle type, fleet size, seats per vehicle, daily rate, licence). | M | ✅ |
| FR-SUP-3 | Contacts, rating, notes and active flag; delete only when unused. | M | ✅ |
| FR-SUP-4 | Show the trips each supplier serves, with committed and paid amounts. | S | ✅ |

### 3.8 Reports
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-REP-1 | Revenue, refunds, expenses and profit by month for a date range. | M | ✅ |
| FR-REP-2 | Popular trips, seat utilisation and trip profitability (actual or estimated cost). | M | ✅ |
| FR-REP-3 | Outstanding balances with due date and overdue flag. | M | ✅ |
| FR-REP-4 | Breakdown by booking source and payment method. | S | ✅ |

### 3.9 Public agency page
| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| FR-PUB-1 | The agency can enable or disable its public page; a disabled page returns 404. | M | ✅ | T |
| FR-PUB-2 | The page shows the agency's branding and its public, upcoming, published trips with live seats left and offers. | M | ✅ | T |
| FR-PUB-3 | A traveller can submit a booking request that holds seats as a Pending booking and receives a reference. | M | ✅ | T |
| FR-PUB-4 | The page exposes no costs, internal notes or internal identifiers. | M | ✅ | T |

### 3.10 Agency and team
| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-ADM-1 | Edit the agency profile, currency, booking policy (deposit %, due days, terms) and public page settings. | M | ✅ |
| FR-ADM-2 | Add team members with roles; change roles; deactivate. | M | ✅ |
| FR-ADM-3 | The agency always keeps at least one active owner; only owners manage owners. | M | ✅ |
| FR-ADM-4 | Every significant change is written to an activity log in the same transaction. | S | ✅ |

## 4. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-SEC-1 | Security | Input is validated and whitelisted; unknown fields are rejected. |
| NFR-SEC-2 | Security | SQL is parameterised (TypeORM); no string-built queries with user input. |
| NFR-SEC-3 | Security | Rate limits: 300 req/min globally, 10/min for login, 5/min for public booking requests. |
| NFR-SEC-4 | Security | Helmet security headers and CORS restricted to the web origin. |
| NFR-SEC-5 | Security | Errors use one format; database errors and stack traces never reach clients. |
| NFR-SEC-6 | Security | Secrets live only in `.env` (never committed); the JWT secret is at least 32 characters, checked at boot. |
| NFR-REL-1 | Integrity | Business invariants are also enforced by database CHECK constraints (seats ≤ capacity, positive amounts, offer < price, valid dates). |
| NFR-REL-2 | Integrity | Multi-step operations (booking + seats + payment, cancel + release + refund) are atomic. |
| NFR-REL-3 | Integrity | The schema is changed only by reversible migrations. |
| NFR-PERF-1 | Performance | Lists are paginated (maximum 100 rows per page); all tenant queries use composite indexes starting with `agency_id`. |
| NFR-PERF-2 | Performance | The dashboard is one API call with aggregated SQL, with no per-row queries. |
| NFR-USE-1 | Usability | Responsive from 375 px; light and dark themes; text contrast meets WCAG AA (measured). |
| NFR-USE-2 | Usability | Every view has loading, empty and error states; API messages are human-readable. |
| NFR-MAIN-1 | Maintainability | TypeScript end to end; one shared vocabulary package; modular API folders; e2e tests run against a real database. |
| NFR-PORT-1 | Portability | Runs on any laptop with Node.js and XAMPP; `DB_TYPE` selects MariaDB or MySQL. |

## 5. External interfaces
- **User interface:** web console at `/` and public page at `/a/{slug}` (see the design system).
- **API:** REST/JSON at `/api`, OpenAPI at `/api/docs` (see the API contract).
- **Database:** MariaDB/MySQL over TCP 3306.

## 6. Data requirements
See [Database](../database/README.md). In summary:
- 17 tables, 32 foreign keys, 9 CHECK constraints.
- UUID primary keys.
- UTC timestamps with millisecond precision.
- DECIMAL(12,2) for money.

## 7. Traceability to tests
`apps/api/test/bookings.e2e-spec.ts` covers FR-AUTH-3/4/5, FR-BOOK-1/2/3/4/5/6, FR-FIN-1/2/3/4, FR-TRIP-5/8 and FR-PUB-1/2/3/4. Run it with `npm run test:e2e`.

## 8. Roadmap (beyond this release)
1. Online deposit payment (payment gateway) on the public page.
2. Automated WhatsApp and email reminders for balances due and departures.
3. Room allocation and seating plans per vehicle.
4. Multi-currency pricing and exchange rates.
5. Supplier invoices and payables.
6. Mobile app for tour leaders (manifest, check-in).
7. httpOnly cookie sessions, two-factor authentication and audit export.
