# سفرني · Safarni

**The daily operating system for tourism offices.** It covers:
- programs and offers
- prices built from supplier costs plus profit
- bookings with an individual record for every passenger
- customers
- suppliers (hotels, transport, restaurants)
- live seat availability

All of it lives in one dashboard, in Arabic (RTL) and English.

Each office can also enable its own public page, and appear on the Safarni showcase, where travellers browse published trips and contact the office on WhatsApp.

Safarni is **not a central travel marketplace**. It replaces the notebooks, WhatsApp threads, Word files and spreadsheets a tourism office runs on today.

Built for the ByteForFuture × AFK Hackathon 2026.

## What it does

| Module | Highlights |
|---|---|
| **Offices & branches** | Multi-tenant SaaS. Each office has branches, and each employee belongs to exactly one branch. Data is isolated per office and per branch, enforced by the API and by composite database keys. |
| **Roles** | Configurable roles and permissions. Default roles: **Admin** (whole office) and **Reception** (own branch: customers, bookings, cash payments). |
| **Tours & trips** | A Tour is the reusable program (itinerary, images, terms). A Trip is a dated run of it in one branch: VIP or Standard, one currency, minimum passengers, maximum seats, registration deadline. When the deadline passes, the admin decides to **approve, extend or cancel**. |
| **Pricing & profit** | One supplier per service type (hotel, transport, restaurant), each with its own profit %: **selling = cost × (1 + profit%)**. Example: a coach at 200,000 SYP net plus 15% = 230,000. |
| **Bookings** | **Only confirmed bookings take seats**, and seats never oversell, even under simultaneous requests. Includes a waiting list, transfers to another trip, and price snapshots that never change afterwards. |
| **Payments** | Cash payments in the booking's currency, receipts, and refunds linked to the original payment. Payment history is never deleted. |
| **Supplier dues** | What the office owes each supplier (cost × confirmed passengers), what it has paid, and what remains. |
| **Offers** | Percentage or fixed discount per person, with a validity period. Overlapping offers are refused. |
| **Dashboard & reports** | Money is kept per currency. Revenue, collected cash, expected profit and realised profit stay separate. Seven reports with Excel export and print-to-PDF. |
| **Public pages** | The Safarni showcase with moving ads and filters; office pages with a map and WhatsApp; trip pages with a prefilled WhatsApp "Book now". There is no checkout and no customer accounts. |
| **Supplier integrations** | A secure foundation for the hotel and transport systems' APIs (adapters pending their documentation). See `docs/integrations`. |

## Tech stack

- **Web:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query and Table, React Hook Form + Zod, Recharts, Motion. Arabic RTL and English LTR.
- **API:** NestJS 12, Prisma 7 (driver adapter `@prisma/adapter-pg`), JWT access tokens + rotating refresh tokens, Passport, bcrypt, class-validator, Swagger, Helmet, Throttler, decimal.js, ExcelJS.
- **Database:** PostgreSQL 18, with versioned Prisma migrations, 15 CHECK constraints and composite `(office_id, id)` foreign keys.
- **Quality:** 40 end-to-end tests against the real database, ESLint, Prettier, TypeScript strict.

## Getting started (Windows)

Prerequisites: **Node.js 22+** (with npm) and **PostgreSQL** (16+).

1. Create a database and a user for Safarni. For example, in `psql` as the `postgres` user:
   ```sql
   CREATE ROLE safarni LOGIN PASSWORD 'choose-a-password' CREATEDB;
   CREATE DATABASE safarni OWNER safarni;
   ```
2. Copy `.env.example` to `.env`. Do this **once only**, on a fresh clone. Then set:
   - `DATABASE_URL`: your database, user and password
   - `JWT_SECRET`: any random text of at least 32 characters
3. Install the dependencies. The Prisma client is generated automatically:
   ```powershell
   npm install
   ```
4. Run the migrations and load the demo data:
   ```powershell
   npm run db:setup
   ```
5. Start the API and the web app together:
   ```powershell
   npm run dev
   ```

| What | Where |
|---|---|
| Safarni showcase (public) | http://localhost:3000 |
| Office page (public) | http://localhost:3000/sham-travel |
| Dashboard | http://localhost:3000/dashboard |
| API | http://localhost:3001/api |
| API docs (Swagger) | http://localhost:3001/api/docs |

The demo accounts are in [docs/DEMO.md](docs/DEMO.md). All of them use the password `Safarni@2026`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | API (watch) + web (dev) |
| `npm run build` | Build the shared package, API and web |
| `npm run test:e2e` | End-to-end API tests against the database |
| `npm run lint` | ESLint for API and web |
| `npm run db:migrate` | Apply the migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Load the demo data (refuses if it already exists) |
| `npm run db:reset` | Drop everything, re-apply the migrations and seed again (asks Prisma for confirmation) |
| `npm run db:studio` | Browse the database with Prisma Studio |

### Troubleshooting: "port 3000 (or 3001) is already in use"

Safarni is probably already running in another terminal. Check before starting a second copy:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001 | ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" | Select-Object ProcessId, CommandLine }
```

If the port belongs to another application, don't stop it. Change `API_PORT`, `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` in `.env` instead.

## Project structure

```
travelos/
├── apps/
│   ├── api/                NestJS API
│   │   ├── prisma/         schema.prisma, migrations, seed.ts
│   │   ├── src/            one folder per module (auth, offices, branches, employees, roles, tours,
│   │   │                   trips, suppliers, customers, bookings, reports, public-pages, integrations…)
│   │   └── test/           e2e tests (auth, isolation, pricing, seats, money rules, reports, public pages)
│   └── web/                Next.js web app (dashboard, public pages, design system, i18n)
├── packages/shared/        permissions catalogue, default roles, enums and AR/EN labels
└── docs/                   SRS, architecture, database, API, integrations, open decisions, demo
```

## Documentation

- **Requirements:** [SRS](docs/srs/SRS.md), [Use cases](docs/use-cases/README.md), [Open decisions & technical defaults](docs/OPEN-DECISIONS.md)
- **Design of the system:** [Architecture](docs/architecture/README.md), [Database](docs/database/README.md)
- **API & integrations:** [API](docs/api/README.md) (plus Swagger and `docs/api/openapi.json`), [Supplier integrations](docs/integrations/README.md)
- **Interface:** [Design system](docs/design/design-system.md), [Frontend brief](docs/FRONTEND-BRIEF.md)
- **Running the demo:** [Demo guide](docs/DEMO.md)

## Security at a glance

- Every record belongs to one office. Branch-owned records (trips, bookings, payments) also belong to one branch.
- The office and branch come only from the verified token. Requests for other offices' or branches' ids return **404**.
- **Passwords and sessions:**
  - bcrypt passwords
  - 15-minute access tokens
  - refresh tokens that rotate, are stored hashed, and revoke the whole session when reused
- **Requests:** rate limiting, Helmet headers, validated and whitelisted input.
- **What never leaks:** supplier API secrets are never stored or returned (only the name of a server-side secret). Public pages never expose costs, profit or internal ids.
