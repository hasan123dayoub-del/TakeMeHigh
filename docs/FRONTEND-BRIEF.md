# Safarni web: engineering brief for feature work

Safarni (سفرني) is a multi-tenant SaaS for **tourism offices**: the internal daily-operations dashboard, plus optional public pages.

- **Business source of truth:** the Master Project Context, summarised in `docs/srs/SRS.md`, and `docs/OPEN-DECISIONS.md`.
- **The backend is the authority** for permissions, prices, booking statuses and seats. Never compute authoritative totals in the UI.

## Stack and where things are

- `apps/web`: Next.js 16.4 (App Router), React 19.3, Tailwind CSS v4, TypeScript, TanStack Query/Table, react-hook-form + zod, Recharts, motion, sonner, Radix.
  - **This Next.js has breaking changes:** read `apps/web/node_modules/next/dist/docs/` when unsure. Params and searchParams are async; client components use `useSearchParams` inside `<Suspense>`.
- **Package manager is npm**, always run from the repo root `C:\Hakathon\travelos`:
  - `npx tsc --noEmit -p apps/web/tsconfig.json`
  - `npm run lint -w @travelos/web`
- **API:** http://localhost:3001/api.
  - Exact shapes: `docs/api/openapi.json` (60 paths), or http://localhost:3001/api/docs-json.
  - Call the real endpoints with curl to see real responses. **Never invent fields.**
- **Demo data:** `apps/api/prisma/seed.ts`. All demo accounts use the password `Safarni@2026`.

| Account | Role |
|---|---|
| `admin@sham-travel.safarni.local` | Admin, office-wide (all branches) |
| `reception.damascus@sham-travel.safarni.local` | Reception, Damascus branch only |
| `reception.aleppo@sham-travel.safarni.local` | Reception, Aleppo branch only |
| `admin@coast-tours.safarni.local` | Admin of another office (isolation) |
| `platform@safarni.local` | Platform admin (no office) |

## Design system: approved "Cirrus" (sky-blue glass, ink active pills)

- **Read first:**
  - `docs/design/design-system.md`
  - `apps/web/src/app/globals.css`
  - everything in `apps/web/src/components/ui/`
  - `apps/web/src/components/app-shell/*`
- **Reuse the primitives:**
  - Layout: Button, GlassPanel/Card, PageHeader, StatCard, Sparkline, Skeleton
  - Data: DataTable, StatusBadge, EmptyState
  - Overlays and navigation: Dialog, Sheet, Tabs, SegmentedControl, DropdownMenu, Tooltip
  - Forms: FormField, Input, Select, Textarea
- **Colours:** tokens only (`bg-surface`, `text-muted`, `bg-primary`, `bg-ink`, chart-1..6…). No random colours. Light and dark must both look designed.
- **Status badges:** `<StatusBadge kind="trip"|"booking"|"tripType" status=… />` (labels follow the language).

## Language and direction (mandatory)

- **Arabic is the default, RTL. English is LTR.** The layout must truly mirror, not just translate.
- **Never hard-code user-facing strings.** Each module defines its own messages next to its code:
  ```ts
  import { defineMessages, fmt, useMessages } from '@/lib/i18n';
  const m = defineMessages({ ar: { title: 'الرحلات', seatsLeft: 'متبقي {n} مقعد' }, en: { title: 'Trips', seatsLeft: '{n} seats left' } });
  const t = useMessages(m); fmt(t.seatsLeft, { n: 3 })
  ```
  - Shared words live in `@/lib/i18n/common` (`useMessages(common)`).
  - Domain enum labels: `LABELS` from `@travelos/shared` (e.g. `LABELS.supplierType.HOTEL[locale]`).
  - Server components: `getLocale()` / `getMessages()` from `@/lib/i18n/server`.
- **Use logical Tailwind classes only:** `ms-/me-/ps-/pe-/start-/end-/text-start/text-end/border-s/border-e/rounded-s/rounded-e`. **Never** `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`.
  - Directional icons (arrows, chevrons) get `className="rtl-flip"`.
  - Phone numbers, emails, codes and references inside Arabic text: wrap them in `<span className="ltr-nums">` or put `dir="ltr"` on inputs.
- **Numbers, money and dates:** `const f = useFormat()` from `@/lib/use-format`.
  - `f.money(amount, currencyCode)`, `f.date(d)`, `f.relative(d)`, `f.number(n)`.
  - Money values from the API are decimal strings.
  - **Every amount carries its own currency** (SYP or USD per trip and booking). **Never add amounts of different currencies.** Show totals per currency.

## Data and auth

- **API client:** `api.get/post/patch/put/delete` and `api.download(path, query, fallbackName)` for Excel, from `@/lib/api`.
  - The client refreshes tokens automatically.
  - Errors are `ApiError` with `.status` and `.messages`. **400, 403 and 409 messages are written for humans: show them verbatim** (inline or as a toast).
- **TanStack Query** for all data; invalidate the related queries after mutations.
  - Put query hooks in `apps/web/src/lib/queries/<area>.ts` and types in `apps/web/src/lib/types/<area>.ts` (your own files).
- **Permissions:** `const { can, scope, user, office } = useAuth()`, e.g. `can('refunds.record')`.
  - Hide what the role can't do. Show a designed "no access" state for pages the role can't open (`common.forbiddenTitle` / `forbiddenBody`).
  - **The API enforces everything anyway.**
  - Permission keys are in `packages/shared/src/index.ts`. Reception: `tours.view`, `trips.view`, `customers.*`, `bookings.view/create/edit/confirm/cancel`, `payments.view/record`, `reports.view`.
- **Branch scope:** Admins see all branches (`scope === 'OFFICE'`), Reception only its own (`'BRANCH'`); the API already filters.
- **Never show a fake success.** Toast success only after the API call resolved.

## Routes (under `apps/web/src/app/`)

- **Dashboard:**
  - `dashboard/` (protected by `dashboard/layout.tsx`; pages export `export const instant = false;`)
  - sections: `tours`, `trips`, `bookings`, `customers`, `suppliers`, `payments`, `reports`, `settings`
- **Public (no login):**
  - `page.tsx`: the Safarni landing
  - `[officeSlug]/`: the office page
  - `[officeSlug]/trips/[tripId]/`: the trip page

## Quality bar (every view)

- **States:** a designed loading state (skeleton), empty state and error state (with retry).
- **Inputs:** zod validation messages in the current language, confirmation dialogs for destructive actions, keyboard accessible.
- **Responsive:** desktop-first, correct at 375 / 768 / 1280 / 1440 px.
- **Tables:** search, filters and pagination where lists can grow (the API returns `{ data, meta: { page, pageSize, total, totalPages } }`).
- **Printing:** for PDF, give the page print CSS scoped to your own wrapper class (`@media print`) that hides the app chrome, plus a "Print / Save PDF" button (`window.print()`). Arabic must print RTL.

## Rules while several engineers work in parallel

- **Edit only the files in your scope.** Do NOT edit shared files:
  - `components/ui/**`, `components/app-shell/**`, `components/auth/**`, `components/providers.tsx`
  - `lib/api.ts`, `lib/auth*.ts*`, `lib/format.ts`, `lib/use-format.ts`, `lib/i18n/**`
  - `app/globals.css`, `app/layout.tsx`
  - `packages/shared`, `apps/api`, any `package.json`

  Need a new primitive? Create it in your own folder. Blocking bug in a shared file? Work around it and report it.
- **The lead runs `npm run dev`** (web :3000, api :3001):
  - **Do not** start or stop servers, run `next build`, or run `npm run db:reset`.
  - Creating a few test records is fine; prefix them with `QA` / `اختبار`.
- **Browser:** use the `mcp__Claude_Browser__*` tools.
  - First `tabs_create` your own tab and pass its `tabId` on every call. Never touch other tabs.
  - localStorage and cookies are shared across tabs: **never sign out or sign in as a different account in the browser** (test other roles with curl). If you land on `/login`, sign in as the admin.
  - Changing the language cookie affects other tabs: switch to English only briefly to check, then switch back to Arabic.
- **Before reporting:**
  - Typecheck and lint must be clean for your files.
  - Check every page in Arabic and English, light and dark, and at 375 px, with no console errors from your code.
  - **Do not git commit**; the lead reviews and commits.
- **Report concisely:** routes and files, what you verified (exact results), known gaps, shared-file issues.
