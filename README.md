# TakeMeHigh

[![CI](https://github.com/hasan123dayoub-del/TakeMeHigh/actions/workflows/ci.yml/badge.svg)](https://github.com/hasan123dayoub-del/TakeMeHigh/actions/workflows/ci.yml)

**The daily operating system for a travel agency.** It replaces the notebooks, WhatsApp threads, Word files and spreadsheets a travel office runs on today, with one dashboard. That dashboard covers:

- trips, programs and offers
- prices built from supplier costs plus the office's profit
- bookings, with every passenger recorded
- customers and their travel documents
- visas
- cash payments and receipts
- registration deadlines
- monthly and yearly statistics

Each office also gets its own **public page**. There, visitors browse ready trips, book through WhatsApp, or design their own trip.

TakeMeHigh is sold as **one installation per agency** (single-tenant), not as a shared SaaS. The office's Admin owns and runs the installation.

The full specification, written in Arabic to the IEEE 830 template, is in [`docs/srs/takemehigh`](docs/srs/takemehigh). It includes the ERD and the role/permission matrix. Requirement ids such as `TRP-05` in the code and tests point to it.

## Live demo

| | |
|---|---|
| 🌐 **Public site** (for customers) | [takemehigh-hasan.vercel.app](https://takemehigh-hasan.vercel.app) |
| 🔑 **Dashboard login** (one-click demo accounts on the page) | [takemehigh-hasan.vercel.app/login](https://takemehigh-hasan.vercel.app/login) |
| ⚙️ **API docs** (Swagger, try requests in the browser) | [takemehigh-api-hasan.vercel.app/api/docs](https://takemehigh-api-hasan.vercel.app/api/docs) |

Demo accounts, password `TakeMeHigh@2026` for all: Admin `admin@takemehigh.local`; branch manager `manager.damascus@takemehigh.local`; employee `employee.damascus@takemehigh.local`; tour guide `guide.damascus@takemehigh.local` (Aleppo has the same accounts).

Hosting: Vercel (the NestJS API as one serverless function in Frankfurt, next to its Neon PostgreSQL database; the Next.js app as a second project from the same repository).

## My contribution

I built TakeMeHigh on my own, end to end (November 2026): the analysis and the Arabic SRS, the database, the API, the dashboard, the public site, the tests and the deployment.

- **API:** 165 REST endpoints in NestJS 12 + TypeScript, over 45 Prisma models on PostgreSQL, with Swagger docs. JWT with rotating refresh tokens, 4 roles with an editable permission catalogue, and data scoped per branch.
- **Data integrity:** money as `NUMERIC(14,2)` with decimal.js, database CHECK constraints and triggers (payments cannot be edited or deleted, gap-free receipt numbers), and seat booking that never oversells. Measured in an end-to-end test: 12 simultaneous confirmations on 5 seats give exactly 5 confirmed and 7 on the waiting list.
- **Dashboard and public site:** 44 pages in Next.js 16 and React 19, Arabic right-to-left first with English, statistics with Recharts, Excel and PDF exports.
- **Integrations:** one adapter per supplier platform, with scheduled sync, back-off after failures and encrypted credentials (AES-256-GCM).
- **Quality:** 21 unit tests and 41 end-to-end tests against a real PostgreSQL in GitHub Actions, plus lint, type-check and a web build on every push.
- **Deployment:** Vercel and Neon. NestJS 12 ships only ES modules, which Vercel's function runtime cannot load from CommonJS, so the API is bundled into one CommonJS file with esbuild. Uploads are kept in PostgreSQL on Vercel (`FILE_STORAGE=database`), because serverless functions have no lasting disk.

## What it does

| Module | Highlights |
|---|---|
| **Roles and branches** | Four roles: Admin (all branches), branch manager, employee and tour guide. Every user except the Admin belongs to exactly one branch (enforced by a database trigger). The permission catalogue is editable, and data is scoped per branch. Records outside a user's scope answer 404. |
| **Suppliers** | Services (hotel, transport, restaurant, plus custom ones). Companies have a country and a transport mode (land, sea or air). Each company has items with a cost per person. Default profit rules apply per service or per company. |
| **Integrations** | One adapter per supplier platform: scheduled sync, "Sync now", logs and encrypted keys. When a sync fails, the last known costs stay and are flagged as stale. A cost change flags the open trips that use it. A built-in sandbox supplier is used until the real API documentation arrives. |
| **Trips** | Built from priced service lines in time order, possibly with several transport modes. Place and time continuity is validated, and publishing needs at least two different services. Also: boarding points with surcharges, guides, images, a manifest with attendance, clone, and "accept new costs". |
| **Programs** | An ordered chain of two or more trips, for example Damascus → Tartus by land, Tartus → Arwad by sea, and the Umrah program. The price is the sum of the trips. Seats are taken on every leg. |
| **Offers** | Service bundles at a discount, or discounts on trips and programs. Discounts never stack; the best one applies automatically. |
| **Bookings** | "Add customer" on any trip, program or bundle. Passengers are linked through a junction table, and the payer may not travel. Seats never oversell, even under simultaneous requests. Also: a waiting list with promotion, transfers, price snapshots, and document rules (Syrian ID, or passport + visa) with automatic visa records for trips abroad. |
| **Payments** | Partial or full cash payments, gap-free receipt numbers, and a printable PDF receipt (later prints are marked "copy"). Refunds are linked to the original payment. Payments cannot be edited or deleted (database trigger). |
| **Registration** | Closes automatically at the deadline, or by hand, and records the passenger total and the date. After closing the Admin can confirm, extend, reopen or cancel. |
| **Reports** | Excel and PDF export above every table, server-side pagination, outstanding balances, daily cash, and Admin-only monthly and yearly statistics (revenue, bookings, expected and realised profit, per currency). |
| **Public page** | A slider of offers and programs, filters by trip type, offers and discounts, "Book now" on WhatsApp with a prefilled message, achievements with photos, branches, and terms and policies. The "Design your trip" form lets the visitor pick from the office's companies or suggest others. |
| **Audit** | An append-only log of sign-ins and every sensitive change, plus live notifications in the dashboard. |

## Tech stack

- **API:** NestJS 12, Prisma 7 on PostgreSQL 16+, JWT with rotating refresh tokens, class-validator, Swagger, Helmet, Throttler, decimal.js, ExcelJS, sharp, `@nestjs/schedule`.
- **Web:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query and Table, React Hook Form + Zod, Recharts. Arabic RTL first, plus English.
- **Quality:**
  - 21 unit tests and 41 end-to-end tests, run against a fresh PostgreSQL database.
  - Strict TypeScript, ESLint and Prettier.
  - A GitHub Actions workflow.
- **Database guards:** CHECK constraints, triggers and a view (see [`docs/database`](docs/database)).

## Quick start (this machine)

Double-click **`start-takemehigh.cmd`**, or run `npm start`. It does the following:

1. starts the local PostgreSQL and waits until it accepts connections,
2. applies the migrations,
3. loads the demo data on the first run,
4. starts the API and the web app.

Then open http://localhost:3000.

## Getting started (any machine)

Prerequisites: **Node.js 24.9+** (NestJS 12 is ESM-only) and **PostgreSQL 16+**.

1. Create a database and a role, for example:
   ```sql
   CREATE ROLE takemehigh LOGIN PASSWORD 'choose-a-password' CREATEDB;
   CREATE DATABASE takemehigh OWNER takemehigh;
   ```
2. Copy `.env.example` to `.env`, then set `DATABASE_URL`, `JWT_SECRET` and `CREDENTIALS_KEY`. The two secrets need 32 random characters or more.
3. Install the dependencies: `npm install`.
4. Apply the migrations and choose one of two paths:
   - **Demo:** `npm run db:setup` loads the fictional office "سما الشام للسياحة والسفر".
   - **Real client:** `npm run setup:install -w @travelos/api -- --office "اسم المكتب" --email admin@office.sy --password "Initial-Pass-2027" --whatsapp 963944000000`. This creates the reference data and the first Admin. The Admin must change the password at the first sign-in, then adds the branches and the staff.
5. Start both apps: `npm run dev`.

| What | Where |
|---|---|
| Public page | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| API | http://localhost:3001/api |
| API docs (Swagger) | http://localhost:3001/api/docs |

The demo accounts and a suggested presentation are in [docs/DEMO.md](docs/DEMO.md). Every demo account uses the password `TakeMeHigh@2026`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | API (watch) + web (dev) |
| `npm run build` | Build the shared package, the API and the web app |
| `npm test` | API unit tests |
| `npm run test:e2e` | API end-to-end tests. They run on a separate `<db>_test` database, rebuilt every run. |
| `npm run lint` | ESLint for the API and the web app |
| `npm run db:migrate` / `db:seed` / `db:reset` | Migrations / demo data / rebuild the demo (asks for confirmation) |
| `npm run setup:install -w @travelos/api -- …` | First installation for a real client |

## Documentation

| Document | Contents |
|---|---|
| [`docs/srs/takemehigh`](docs/srs/takemehigh) | The SRS (Arabic, IEEE): 228 requirements, the ERD, the data dictionary and the permission matrix |
| [`docs/architecture`](docs/architecture) | System overview and the main design decisions |
| [`docs/database`](docs/database) | Model and the rules enforced by the database |
| [`docs/api`](docs/api) | API conventions and the OpenAPI document |
| [`docs/integrations`](docs/integrations) | Supplier integrations, the REST contract and the sandbox |
| [`docs/OPEN-DECISIONS.md`](docs/OPEN-DECISIONS.md) | How each open SRS item (TBD) is implemented |
| [`docs/frontend-conventions.md`](docs/frontend-conventions.md) | How dashboard and public pages are built |
| [`docs/design/design-system.md`](docs/design/design-system.md) | The Cirrus design system |

## Project structure

```
travelos/
├── apps/
│   ├── api/       NestJS API: prisma/ (schema, migration, seed, install), src/ (one folder per module), test/ (e2e)
│   └── web/       Next.js: dashboard, public page, design system
├── packages/shared/   permission catalogue, system roles, enums, AR/EN labels
├── docs/              SRS, architecture, database, API, integrations, decisions
└── scripts/           one-command local start
```
