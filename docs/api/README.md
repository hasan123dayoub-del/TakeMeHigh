# API

- Interactive documentation (Swagger UI): `http://localhost:3001/api/docs`. Sign in with `POST /api/auth/login`, then press **Authorize** and paste the `accessToken`.
- OpenAPI document: [`openapi.json`](./openapi.json), exported from the running API. It has 126 paths and 163 operations.
- The descriptions of the endpoints carry the requirement ids of the SRS, such as `TRP-05`.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `/api` |
| Authentication | `Authorization: Bearer <accessToken>`. The access token lasts 15 minutes. `POST /auth/refresh` rotates the refresh token, and reusing an old one revokes the session. A session ends after 30 idle minutes. |
| Permissions | Each route declares its permission codes, for example `trips.manage`. A missing permission returns 403. A record outside the user's branch or assignment returns 404. |
| Lists | `page`, `pageSize` (≤ 100), `search`, `sort`, `order` (`asc`/`desc`). The response is `{ data, meta: { page, pageSize, total, totalPages } }`. |
| Exports | `export=xlsx` downloads every matching row as Excel (an RTL sheet with the office header). `export=all` returns every matching row as JSON, which the web app's PDF print view uses. |
| Money | Decimal strings with 2 decimals, always with a currency code. Different currencies are never added together. |
| Dates | ISO 8601 (UTC). |
| Errors | `{ statusCode, error, message, path, timestamp }`. `message` is an array for validation errors, which list every broken rule. |
| Hidden fields | Costs, profit and line prices are left out for roles without `pricing.view_breakdown` (PRC-06). The public endpoints never include them (PRC-07). |

## Main groups

| Group | Endpoints |
|---|---|
| Auth | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password` |
| Administration | `/users`, `/roles`, `/roles/permissions`, `/branches`, `/audit-logs` |
| Reference data | `/lookups`, `/countries`, `/cities`, `/categories`, `/currencies` |
| Suppliers | `/services`, `/companies`, `/companies/:id/items`, `/items/:id`, `/catalog`, `/profit-rules`, `/integrations` |
| Products | `/trips` (and `lines`, `pickup-points`, `guides`, `images`, `publish`, `close`, `decision`, `cancel`, `clone`, `accept-costs`, `passengers`), `/programs`, `/offers` |
| Customers and bookings | `/customers` (and `documents`, scan `file`, signed `link`), `/bookings` (`confirm`, `cancel`, `transfer`, `passengers`, `payments`), `/payments` (`receipt`, `printed`, `refund`), `/visas` |
| Reports | `/dashboard`, `/notifications`, `/stats`, `/reports/outstanding`, `/reports/daily-payments` |
| Public site, no authentication | `/public/site`, `/public/trips`, `/public/programs`, `/public/offers`, `/public/policies/:slug`, `/public/request-options`, `POST /public/requests` |
| Office side of the public site | `/requests`, `/cms/settings`, `/cms/slides`, `/cms/achievements`, `/cms/policies`, `/uploads/images` |
