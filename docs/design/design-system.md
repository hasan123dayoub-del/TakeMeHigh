# TravelOS design system: Cirrus

Cirrus is named after the highest, lightest clouds. A powder-sky gradient canvas carries **one** large frosted-glass panel. Navigation is a white pill bar with an **ink-black active pill**. Headings are wide, light and uppercase (Outfit). An 11-step sky scale drives charts, badges, hover and active states.

- Source of truth for values: `apps/web/src/app/globals.css` (Tailwind v4 `@theme` + CSS variables).
- Approved reference: `/design-lab/aero` (the lab files are frozen; production code never imports from `components/design-lab`).
- Primitives: `apps/web/src/components/ui/*`. App shell: `apps/web/src/components/app-shell/*`.

## 1. Colour tokens

Use the **semantic** utilities (`bg-surface`, `text-muted`, `bg-primary` …). They switch automatically between light and dark (`.dark` on `<html>`, set by next-themes). Use raw `sky-*` only for charts and illustrations.

### Sky scale (`sky-50 … sky-950`, replaces Tailwind's default sky)

| Step | HEX       | Step | HEX       |
| ---- | --------- | ---- | --------- |
| 50   | `#F2F8FD` | 600  | `#3F70AB` |
| 100  | `#E3EFFA` | 700  | `#335A8C` |
| 200  | `#C9DDF3` | 800  | `#2C4B73` |
| 300  | `#A9C8EC` | 900  | `#273F5F` |
| 400  | `#7FA7D3` | 950  | `#18263B` |
| 500  | `#5B8CC4` |      |           |

### Semantic tokens

| Token (utility)                          | Light                                                      | Dark                                              | Use                                                 |
| ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| `--canvas` (`bg-canvas`)                 | powder-sky radial + linear (`#DCE9F7 → #C9DDF3 → #E6F0FA`) | night (`#0B1626 → #10233D → #0A1A2E`)             | Page background behind the glass panel              |
| `--background` (`bg-background`)         | `#F5F9FD`                                                  | `#121E30`                                         | Body fallback                                       |
| `--glass` / `--glass-border` (`glass`)   | `rgb(255 255 255 / .74)` / `/ .9`                          | `rgb(18 30 48 / .72)` / `rgb(169 200 236 / .14)`  | The single frosted panel (blur 24px, saturate 150%) |
| `--surface` (`bg-surface`)               | `#F3F6FA`                                                  | `#19273B`                                         | Cards inside the panel                              |
| `--surface-raised` (`bg-surface-raised`) | `#FFFFFF`                                                  | `#1F2F46`                                         | Pills, icon buttons, inputs, menus, dialogs         |
| `--surface-sunken`                       | `#EAF0F7`                                                  | `#152234`                                         | Skeleton base, wells                                |
| `--border` / `--border-strong`           | `#E3EBF4` / `#C9D7E6`                                      | `#24344B` / `#33465F`                             | Hairlines / hover borders                           |
| `--text` (`text-foreground`)             | `#111418`                                                  | `#EAF2FB`                                         | Body text                                           |
| `--text-muted` (`text-muted`)            | `#5A6878`                                                  | `#9DB0C7`                                         | Secondary text, labels                              |
| `--text-subtle` (`text-subtle`)          | `#6B7785`                                                  | `#8197B0`                                         | Placeholders, meta                                  |
| `--primary` / `-foreground`              | `#3F70AB` (sky-600) / `#FFFFFF`                            | `#7FB4EA` / `#0A1626`                             | Primary actions, links, focus                       |
| `--primary-hover`                        | `#335A8C`                                                  | `#A9C8EC`                                         |                                                     |
| `--accent` (`bg-accent`)                 | `#7FA7D3` (sky-400)                                        | `#A9C8EC`                                         | Decorative only, or with ink text                   |
| `--accent-soft`                          | `#E3EFFA`                                                  | `#1D3150`                                         | Selected rows, icon halos                           |
| `--ink` / `-foreground` (`bg-ink`)       | `#1C1C1E` / `#FFFFFF`                                      | `#E3EFFA` / `#111418`                             | Active pill, ink buttons, tooltips                  |
| `--ring`                                 | `#5B8CC4`                                                  | `#7FB4EA`                                         | Focus outlines                                      |
| `--success`                              | `#2E8A62`                                                  | `#4CC99A`                                         |                                                     |
| `--warning`                              | `#B7740A`                                                  | `#F2C063`                                         |                                                     |
| `--danger` / `-foreground`               | `#C23A3A` / `#FFFFFF`                                      | `#F08A8A` / `#1A0B0B`                             |                                                     |
| `--info`                                 | `#335A8C`                                                  | `#84CBFB`                                         |                                                     |
| `--neutral`                              | `#6B7785`                                                  | `#9DB0C7`                                         | Draft / refunded badges                             |
| `--chart-1 … 6`                          | `#335A8C #5B8CC4 #3AA5D8 #7FA7D3 #B5D3F0 #1C1C1E`          | `#7FB4EA #4FB0F5 #A9C8EC #5B8CC4 #D8E9F8 #F5F7FA` | Series 1–5; 6 = target / last-period line           |

### Gradients

| Utility       | Light                                     | Dark                                | Text on top           |
| ------------- | ----------------------------------------- | ----------------------------------- | --------------------- |
| `bg-altitude` | 120°, `#335A8C → #3F70AB (55%) → #A9C8EC` | 120°, `#10233D → #2C4B73 → #5B8CC4` | `#FFFFFF` / `#F2F8FD` |
| `bg-powder`   | 135°, `#C9DDF3 → #7FA7D3 → #3F70AB`       | 135°, `#4FB0F5 → #A9C8EC`           | `#111418` / `#0A1626` |

`bg-altitude` is the hero material (featured KPI card, login visual). Use it **once per row**. The light mid stop is sky-600 instead of the lab's sky-500 so white text stays AA across the text-bearing half; keep text on the start (left) side of the card.

## 2. Typography

| Role      | Font (variable)                          | Style                                                                                                             |
| --------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Display   | Outfit (`--font-outfit`, `font-display`) | `heading-display`: weight 300, uppercase, letter-spacing 0.12em. Emphasise one word with `<strong>` (weight 500). |
| Body / UI | Inter (`--font-inter`, `font-sans`)      | 13–15px UI text, 11px eyebrow labels                                                                              |
| Numbers   | Inter + `num` utility                    | Tabular figures for money, counts and dates in tables                                                             |

Scale: hero title 34 / 48 / 56px (mobile / sm / lg), page title 30 / 40 / 46px, card title 15px uppercase, KPI value 32px medium, body 15px, UI 13–14px, eyebrow 11–12px uppercase with 0.16–0.22em tracking (`eyebrow` utility).

Fonts load through `next/font/google` in the root layout (self-hosted, `display: swap`).

## 3. Spacing, radius, elevation

- Spacing: Tailwind 4px scale. Page rhythm: canvas padding 8 / 16 / 24 / 32px, glass panel padding 12 / 24 / 32px, 12px gap between cards, 32–48px between header and content.
- Radius roles: `rounded-field` 14px (inputs), `rounded-tile` 18px (menus, list tiles), `rounded-card` 24px (cards), `rounded-panel` 32px (glass panel), `rounded-full` for buttons, pills and icon buttons.
- Shadows: `shadow-card` (hairline), `shadow-pop` (menus, dialogs), `shadow-glass` (panel), `shadow-primary` (primary button glow).
- Motion: `ease-out-soft` (`cubic-bezier(.22,1,.36,1)`), 150–320ms. Animations: `animate-rise` (page headers), `pop-in/out` (menus, tooltips), `dialog-in/out`, `sheet-in/out-*`, `shimmer` (skeleton). All are disabled under `prefers-reduced-motion`.

## 4. Components (`components/ui`)

| Component                               | Notes                                                                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                | Variants `primary` (sky-600, AA), `secondary` (white pill), `ink`, `outline`, `ghost`, `destructive`, `link`; sizes `xs sm md lg icon icon-sm`; shape `pill` (default) / `rounded`; `loading`; `asChild` for links.                                |
| `Input`, `Textarea`, `Select*`, `Label` | 44px fields, white on glass, 4px focus ring. `Input` takes `startIcon` / `endSlot`.                                                                                                                                                                |
| `FormField`                             | Label + control + hint + error. Wires `id`, `aria-invalid`, `aria-describedby` into the control through context.                                                                                                                                   |
| `GlassPanel`, `Card*`                   | One glass panel per screen; `Card tone="surface" \| "raised" \| "altitude"`; `CardTitle` is the uppercase display heading.                                                                                                                         |
| `Badge`, `StatusBadge`                  | Tones `neutral primary info success warning danger ink`. `StatusBadge kind="trip" \| "booking" \| "payment"` maps every status from `@travelos/shared` to a label and tone.                                                                        |
| `SegmentedControl`                      | Radix ToggleGroup; animated ink active pill; `contained` (track) or `loose` (filter chips).                                                                                                                                                        |
| `Tabs`                                  | Pill (ink active) or `underline` variant.                                                                                                                                                                                                          |
| `Dialog`, `Sheet`                       | Radix Dialog; sheet sides `left right bottom` (mobile nav uses `left`).                                                                                                                                                                            |
| `DropdownMenu*`, `Tooltip`              | Radix; white popover with `shadow-pop`; tooltip is ink.                                                                                                                                                                                            |
| `Table*`, `DataTable`                   | TanStack Table v9 (`useTable`, `dataTableFeatures`, `dataTableColumns<T>()`): client or server sorting, loading skeleton rows, empty state, pagination footer driven by `Paginated<T>.meta` (1-based pages). Column `meta.align: 'end'` for money. |
| `Skeleton`, `EmptyState`                | Empty state = icon in a sky orbit + title + description + CTA (+ optional children).                                                                                                                                                               |
| `StatCard`, `Sparkline`                 | KPI card from the approved dashboard: label, value, delta chip (good = success, bad = warning), SVG sparkline; `featured` uses `bg-altitude`.                                                                                                      |
| `PageHeader`, `TodayLine`               | Date line (client-rendered to avoid locale mismatch) + uppercase title + description + actions; `size="hero"` for the dashboard greeting.                                                                                                          |
| `Avatar`                                | Radix Avatar with powder-gradient initials fallback.                                                                                                                                                                                               |

Formatting (`lib/format.ts`): `formatMoney(value, agency.currency)`, `formatNumber`, `formatPercent`, `formatDate(value, 'medium' | 'short' | 'long' | 'dateTime' | 'time')`, `formatRelative`, `greeting()`. Get the currency with `useCurrency()`.

## 5. App shell, auth and data

- `/login` (glass split layout, zod validation, demo-account chips for the five roles), `(app)` route group protected by `AuthGate`, `/` redirects to `/dashboard` or `/login`.
- `AuthGate` renders nothing protected until `GET /auth/me` succeeds. Signed-out users go to `/login?next=<path>`; any 401 from the API clears the session and returns to sign-in with a toast.
- Navigation items and module pages are filtered with `can(role, permission)` from `@travelos/shared` (UI only; the API enforces the same rules). Direct visits to a forbidden module show a "no access" state.
- Every page in `(app)` exports `instant = false`: the protected subtree is rendered client-side after the session check, so Next.js instant-navigation validation would otherwise report the page as "dropped". New pages in the group need the same export.
- `lib/api.ts`: `api.get/post/patch/put/delete`, bearer token, `ApiError` mirrors `{ statusCode, error, message, path, timestamp }` (`messages[]` for validation errors), `errorMessage(err)` for toasts.
- **Token storage trade-off:** the access token is in `localStorage` (`travelos.token`). Simple and survives reloads, but readable by any XSS on the origin. Production should move to an httpOnly, `SameSite=Strict` cookie issued by the API, plus CSRF protection.
- Responsive shell: `xl+` full pill labels; `md–xl` icon pills with tooltips (active item keeps its label) and the wordmark hidden on `md–lg`; below `md` a menu button opens a left `Sheet` with navigation and account.

## 6. Contrast (WCAG 2.1, measured)

| Pair                                      | Light                                | Dark    |
| ----------------------------------------- | ------------------------------------ | ------- |
| Text / background                         | 17.46:1                              | 14.83:1 |
| Text / surface                            | 17.04:1                              | 13.33:1 |
| Muted / background                        | 5.39:1                               | 7.55:1  |
| Muted / surface                           | 5.26:1                               | 6.79:1  |
| Muted / raised                            | 5.70:1                               | 6.10:1  |
| Subtle (placeholder) / raised             | 4.56:1                               | 4.50:1  |
| Primary button text / primary             | **5.10:1** (white on `#3F70AB`)      | 8.32:1  |
| Ink pill text / ink                       | 17.01:1                              | 15.82:1 |
| Primary as link / raised                  | 5.10:1                               | 6.19:1  |
| Badge success (text / tint)               | 5.53:1                               | 5.79:1  |
| Badge warning                             | 5.12:1                               | 6.63:1  |
| Badge danger                              | 6.46:1                               | 5.50:1  |
| Badge info                                | 7.78:1                               | 6.36:1  |
| Danger text / raised (form errors)        | 5.30:1                               | 5.61:1  |
| Altitude text / gradient start            | 7.04:1                               | 14.75:1 |
| Reference CTA: white on sky-400 `#7FA7D3` | **2.51:1, fails**; not used for text | —       |
| Ink on sky-400                            | 7.36:1                               | —       |

Rules: buttons with white text use sky-600 `#3F70AB` or darker; sky-400 `#7FA7D3` is decorative or carries ink text. Raw `success` (4.26:1) and `warning` (3.81:1) on white are for icons and dots only; badge text uses the mixed tone (72% tone + 28% text), which passes AA.
