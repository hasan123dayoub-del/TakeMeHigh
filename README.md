# TravelOS

**The daily operating system for travel agencies.** It covers programs and offers, prices, bookings, customers, hotel and transport suppliers, and live seat availability, all in one dashboard. Each agency can also turn on its own public page where travellers book its ready trips directly.

TravelOS is **not a central travel marketplace**. It replaces the notebooks, WhatsApp threads, Word files and spreadsheets an agency runs on today with one tool its whole team uses every day.

Built for the ByteForFuture × AFK Hackathon 2026.

## What it does

| Module | Highlights |
|---|---|
| **Dashboard** | Revenue this month against last month, outstanding and overdue balances, seats available, pending bookings, upcoming departures, booking trend, live activity feed |
| **Trips & offers** | Programs with dates, capacity, adult and child prices, time-limited offers, day-by-day itinerary, supplier services with costs and projected margin |
| **Bookings** | Booking in under a minute. Seats are reserved atomically, so there is **no overbooking, even under simultaneous requests**. Prices are computed on the server. Deposits confirm bookings automatically. Covers payments, refunds, cancellation (which releases seats) and a printable confirmation. |
| **Customers** | Profiles, booking and payment history, internal notes, duplicate detection, passport masking by role |
| **Suppliers** | Hotels (stars, rooms, nightly rate) and transport (vehicle, fleet, daily rate), plus which trips use them and what is committed |
| **Finance** | Payments, refunds, expenses, net revenue, profit and outstanding balances. All amounts are decimal-safe. |
| **Reports** | Revenue by period, trip profitability, seat utilisation, popular trips, outstanding balances with due dates, booking sources, payment methods |
| **Public agency page** | `/a/{agency}`: the agency's branding, its published trips with live availability and offers, and direct booking requests that hold seats |
| **Team & roles** | Owner, Administrator, Operations Manager, Booking Agent, Accountant, enforced by the API |

## Tech stack

- **Web:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query and Table, React Hook Form + Zod, Recharts, Motion, Sonner.
- **API:** NestJS 12, TypeORM, JWT + Passport, bcrypt, class-validator, Swagger, Helmet, Throttler, decimal.js.
- **Database:** MariaDB 10.4 (XAMPP) or MySQL 8, with versioned migrations, CHECK constraints and seed scripts.
- **Quality:** Jest + Supertest e2e tests against the real database, ESLint, Prettier.

Read more:
- [Architecture](docs/architecture/README.md)
- [Database & ERD](docs/database/README.md)
- [API contract](docs/api/README.md)
- [Design system](docs/design/design-system.md)
- [SRS](docs/srs/SRS.md)
- [Use cases](docs/use-cases/README.md)
- [Demo guide](docs/DEMO.md)

## Getting started (Windows)

Prerequisites: **Node.js 22+** (with npm) and **XAMPP** (for its MySQL/MariaDB).

1. Start **MySQL** in the XAMPP Control Panel.
2. In the project folder, copy `.env.example` to `.env`. Do this **once only**, on a fresh clone. Then set `JWT_SECRET` to any random text of at least 32 characters.
   ```powershell
   Copy-Item .env.example .env
   ```
3. Install the dependencies:
   ```powershell
   npm install
   ```
4. Create the database, run the migrations and load the demo data:
   ```powershell
   npm run db:setup
   ```
5. Start the API and the web app together:
   ```powershell
   npm run dev
   ```

| What | Where |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:3001/api |
| API docs (Swagger) | http://localhost:3001/api/docs |
| Public agency page | http://localhost:3000/a/horizon-travel |
| Database | MariaDB on localhost:3306, database `travelos` |

Demo sign-in: `owner@demo.travelos.local` / `TravelOS@2026`. Every role's account is listed in [docs/DEMO.md](docs/DEMO.md).

### Troubleshooting: "port 3000 (or 3001) is already in use" (`EADDRINUSE`)

Usually TravelOS is **already running** in another terminal. Check before starting a second copy:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001 | ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" | Select-Object ProcessId, CommandLine }
```

- If the command line points to `...\travelos\...` (next dev / apps\api\dist\main), it is TravelOS. Use it at http://localhost:3000, or stop it with `Ctrl+C` in the terminal that started it.
- If another application owns the port, don't kill it. Change the ports instead. For example, to use 3100/3101, set these in `.env`:
  - `API_PORT=3101`
  - `CORS_ORIGIN=http://localhost:3100`
  - `NEXT_PUBLIC_API_URL=http://localhost:3101/api`

  Then start the web app with `npm run dev -w @travelos/web -- --port 3100`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | API (watch) + web (dev) together |
| `npm run build` | Build shared, API and web |
| `npm run test:e2e` | End-to-end API tests against the local database |
| `npm run lint` | ESLint for API and web |
| `npm run db:migrate` / `db:revert` | Apply / revert migrations |
| `npm run db:seed` / `db:reset` | Seed demo data / wipe and reseed |

## Project structure

```
travelos/
├── apps/
│   ├── api/          NestJS API (modules, migrations, seeds, e2e tests)
│   └── web/          Next.js web app (console, public page, design system)
├── packages/
│   └── shared/       Roles, statuses and the permission matrix shared by API and web
├── docs/             Architecture, database, API, SRS, use cases, design, demo
└── scripts/          Helper scripts
```

## Security at a glance

- Every record belongs to one agency, and the agency is taken only from the verified token.
- Requests for another agency's ids return 404.
- Role permissions are enforced by the API.
- bcrypt passwords, rate limiting, Helmet headers, validated and whitelisted input.
- Database errors and stack traces never reach the client.

See [Architecture → Security](docs/architecture/README.md#security-controls) for details and known trade-offs.
