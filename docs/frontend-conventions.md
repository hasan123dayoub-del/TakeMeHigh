# Frontend conventions (apps/web)

How every TakeMeHigh dashboard and public page is built. Requirement ids (e.g. `TRP-05`) refer to the SRS in `docs/srs/takemehigh/TakeMeHigh-SRS-ar.pdf`.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI primitives in `src/components/ui`, TanStack Query and Table, react-hook-form + zod (v4 syntax: `z.string().min(1, { error: '…' })`), lucide-react icons, recharts, sonner toasts.

## Reference page

`src/components/admin/branches-view.tsx` is the template for list and CRUD pages:

- `PageHeader` (eyebrow, title, description, actions).
- `ResourceTable` (`src/components/data/resource-table.tsx`) gives:
  - server pagination, sort and search;
  - URL-backed filters (`filterKeys` plus the `filters` render prop with `FilterSelect`);
  - Excel and PDF export of every matching row (RPT-01).
- A dialog form (react-hook-form + zod) that calls `api.post`/`api.patch`, then `useInvalidate()('/endpoint')`.
- `ConfirmDialog` (`components/data/confirm-dialog.tsx`) before sensitive actions; `reason` asks for a reason.
- `useCan('perm')` hides actions the role cannot use. The API enforces the same rules.

Each route file in `src/app/**/page.tsx` is a thin server file:

```tsx
import { XView } from '@/components/<area>/x-view';
export const instant = false;
export default function Page() { return <XView />; }
```

Routes with params: `export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <XDetail id={id} />; }`

## Shared building blocks (do not edit; add new files instead)

| Need | Use |
|---|---|
| API calls | `api.get/post/patch/put/delete`, `api.download`, `errorMessage` (`src/lib/api.ts`) |
| Lists | `ResourceTable`, `FilterSelect` |
| Single resources | `useResource<T>(path)`, `useList<T>(path, params)` (`src/lib/hooks.ts`) |
| Mutations | `useApiMutation(fn, { success, onSuccess })`, `useInvalidate()` |
| Select options | `useLookups()`: active countries, cities, categories, currencies, services and branches |
| Names | `useName()(obj)`: `nameAr` or `nameEn` for the current language |
| Formatting | `useFormat()`: `money(v, currency)`, `date(v, 'medium' \| 'dateTime' \| 'short' \| 'long' \| 'time')`, `number`, `relative` |
| Statuses | `<StatusBadge kind="product\|booking\|paymentState\|paymentKind\|visa\|request\|integration\|offerKind\|scope" status=… />` |
| Labels | `LABELS` from `@travelos/shared` (`LABELS.transportMode.AIR.ar`, …) |
| Page states | `QueryState` (loading / error / forbidden / not found), `Field` (label + value), `PageSkeleton` |
| Printing | `PrintPortal` + `PrintHeader` (`components/data/print.tsx`). The browser prints, and "Save as PDF" keeps Arabic correct. |
| Auth | `useAuth()`: `user`, `isAdmin`, `scope`, `can`, `canAny`, `roleName`. `useOfficeSettings()` |
| Types | `src/lib/types/api.ts`. If a shape is missing, declare it in your own module file; do not edit the shared one. |
| UI | `Button` (primary, secondary, ink, outline, ghost, destructive, link; sizes xs, sm, md, lg, icon, icon-sm), `Card` (surface, raised, altitude), `Badge`, `Dialog*`, `Sheet*`, `Tabs*`, `Select*`, `Input`, `Textarea`, `FormField`, `StatCard`, `EmptyState`, `Skeleton`, `DropdownMenu*`, `Tooltip` |

## Language and direction

- Arabic is the main language and the layout is RTL. Every string goes through `defineMessages({ ar: {...}, en: {...} })` and `useMessages`.
- Use logical classes only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Never use `ml`, `mr`, `left` or `right` for layout.
- Add `rtl-flip` to directional icons (arrows, chevrons).
- Numbers, phones and codes: add the `num` class (tabular figures) or `ltr-nums`, and `dir="ltr"` on inputs.
- Money always shows with its own currency: `f.money(amount, currencyCode)`. Never mix currencies in one total.

## Business rules the UI must reflect

- Costs, profit and line prices are returned only to roles with `pricing.view_breakdown` (PRC-06). Treat those fields as optional and render them only when present.
- Only the Admin sets profit (`pricing.set_profit`); hide those inputs for others.
- Product lifecycle: DRAFT → OPEN → CLOSED → CONFIRMED / CANCELLED → COMPLETED (SRS B.5).
- Show API validation messages verbatim. They are arrays for 400 errors, and `errorMessage()` joins them.

## Verifying a page

- The API runs on `http://localhost:3001` (Swagger at `/api/docs`, JSON at `/api/docs-json`).
- The web dev server runs on `http://localhost:3000` with hot reload.
- Demo password for every account: `TakeMeHigh@2026`. Accounts:
  - `admin@`
  - `manager.damascus@`
  - `employee.damascus@`
  - `guide.damascus@`
  - `manager.aleppo@`
  - `employee.aleppo@`
  - all on the domain `takemehigh.local`.
- Type-check from `apps/web`: `npx tsc --noEmit`.
