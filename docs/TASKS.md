# TravelOS: team plan and task tracker (24 hours, 5 people)

Status: ✅ done · 🔄 in progress · ⏳ next · ⬜ not started

## Roles and file ownership

Each person owns a set of folders. Changing someone else's files goes through them, which avoids merge conflicts.

| # | Role | Owns |
|---|---|---|
| 1 | Team lead / architect / integration | `apps/api/src/common`, `apps/api/src/app.*`, `packages/shared`, root config, merges, final demo |
| 2 | Backend engineer | `apps/api/src/modules/**`, `apps/api/test/**` |
| 3 | Frontend engineer | `apps/web/src/app/(app)/{bookings,trips,customers}`, `lib/queries/*` |
| 4 | UI/UX designer / frontend | `apps/web/src/components/ui/**`, `app/globals.css`, `app/(app)/{dashboard,reports}`, `app/a/**` (public page), `docs/design` |
| 5 | Database / QA / documentation | `apps/api/src/database/**` (migrations, seeds), `docs/**`, QA checklist, presentation |

**API contract:** `docs/api/README.md` plus Swagger at `/api/docs`. An endpoint shape only changes after the frontend owner agrees.

**Shared vocabulary:** `packages/shared`. Roles, statuses and permissions are defined there only.

## Working rules

- Work on a short branch per task. Make small commits with meaningful messages (`feat(bookings): …`).
- Keep a working build at every milestone. `npm run test:e2e` must pass before merging API changes.
- Never commit `.env`. Never push or deploy during the hackathon without the lead's approval.
- Reset the demo with `npm run db:reset` before every rehearsal.

## Tracker

### Hours 0–2 · Environment and foundation
- ✅ Environment check (Node, Git, XAMPP MariaDB 10.4)
- ✅ Monorepo (npm workspaces), local Git
- ✅ NestJS API + Next.js web scaffolds, shared package
- ✅ Environment variables (`.env.example`), XAMPP-compatible setup

### Hours 2–4 · Data, auth, design
- ✅ Schema: 17 tables, 32 foreign keys, 9 CHECK constraints, initial migration
- ✅ JWT authentication, global guards, permission matrix, rate limiting, Helmet
- ✅ Design exploration (16 identities), **Cirrus** approved
- ✅ Design tokens (light + dark), UI primitives, app shell, login

### Hours 4–9 · Core modules (API)
- ✅ Trips, destinations, itinerary, supplier services
- ✅ Customers (duplicates, masking), suppliers (hotel / transport details)
- ✅ Bookings with atomic seat reservation, payments, refunds, cancellation
- ✅ Dashboard and reports computed from live data
- ✅ Offers (time-limited prices), second migration

### Hours 9–12 · Integration and first demo
- ✅ e2e tests: concurrency, isolation, roles, money rules (9/9 passing)
- ✅ Demo seed (agency, 5 roles, 10 trips, 70+ bookings, payments, expenses)
- 🔄 Dashboard and Reports UI
- 🔄 Trips UI (list, form with offers, detail with itinerary, suppliers, bookings)
- 🔄 Bookings UI (list, new booking flow, detail, payments, cancel, printable confirmation)
- 🔄 Customers, Suppliers, Finance, Settings UI
- 🔄 Public agency page + booking request form

### Hours 12–16 · Polish
- ⏳ Cross-module navigation check, empty, error and loading states
- ⏳ Responsive pass (375 / 768 / 1280 / 1440)

### Hours 16–19 · QA and security
- ⏳ Full QA checklist per role
- ⏳ Production build of all apps, lint clean
- ⏳ Security review (tenant isolation, roles, input validation, headers)

### Hours 19–21 · Documentation
- ✅ README, architecture, database & ERD, API contract, demo guide
- 🔄 SRS and use cases with UML diagram

### Hours 21–23 · Presentation
- ⬜ PowerPoint: problem, solution, market, product, features, architecture, stack, innovation, value, demo, roadmap
- ⬜ Demo script rehearsal (5 minutes, see `docs/DEMO.md`)

### Hours 23–24 · Final
- ⬜ `npm run db:reset`, full verification, submission package
