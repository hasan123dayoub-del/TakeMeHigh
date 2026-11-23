# Database

PostgreSQL 16 or newer (developed on 18), through Prisma 7 with the `@prisma/adapter-pg` driver adapter.

| What | Where |
|---|---|
| Schema | [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) |
| Migration | [`apps/api/prisma/migrations`](../../apps/api/prisma/migrations): one versioned migration, including the hand-written SQL below |
| ERD | [`docs/srs/takemehigh/erd`](../srs/takemehigh/erd): 6 diagrams (`.mmd` source and PNG) |
| Data dictionary | SRS appendix B.3 |
| Demo data | [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts) (`npm run db:seed`) |
| Client installation | [`apps/api/prisma/install.ts`](../../apps/api/prisma/install.ts) (`npm run setup:install`) |

The ERD in the SRS shows `bigint` keys. The implementation uses UUID keys, so record ids cannot be guessed from the API. The relations are otherwise the same.

## Model at a glance

- **Access:**
  - `roles`, `permissions`, `role_permissions`.
  - `users` (with `role_id`, and a `branch_id` that is NULL only for ALL-scope roles), `guide_profiles`, `refresh_tokens`.
- **Reference data:** `countries`, `cities` (governorate / city / tourist spot), `currencies`, `trip_categories`.
  - Countries and cities are never deleted, only disabled (BR-11).
- **Organisation:** `branches`.
- **Suppliers:**
  - `services`, `companies` (with `country_id`, plus `transport_mode` for transport companies), `company_items` (cost per person, source, external ref).
  - `profit_rules`, `integration_connections`, `integration_sync_logs`.
- **Products:**
  - `trips`, `trip_service_lines` (unit cost × quantity, profit, selling price), `trip_pickup_points`, `trip_guides`, `trip_images`.
  - `programs`, `program_trips` (ordered legs).
  - `offers`, `offer_service_lines`, `offer_targets`.
  - `registration_decisions`.
- **Customers and bookings:**
  - `customers`, `customer_documents`.
  - `bookings` (exactly one of trip / program / offer).
  - `booking_passengers` (the junction between customers and bookings), `booking_events`, `visa_applications`.
- **Money:** `payments` (partial, full and refund rows; a refund points at the original payment), `number_sequences` (gap-free yearly numbers).
- **Public site:** `custom_trip_requests`, `custom_trip_request_items`, `landing_slides`, `achievements`, `achievement_images`, `policies`, `site_settings` (a single row).
- **Audit:** `audit_logs`.

## Rules enforced by the database (SQL in the init migration)

| Rule | How |
|---|---|
| ALL-scope roles have no branch; every other user has exactly one (AUTH-09) | `users_branch_rule` trigger |
| A booking targets exactly one of trip, program or offer (BKG-02) | `CHECK num_nonnulls(trip_id, program_id, offer_id) = 1` |
| A discount target and a registration decision each point at exactly one product | `CHECK num_nonnulls(...) = 1` |
| A requested service is an existing company or "Other" text (CTR-05) | `CHECK (company_id IS NOT NULL OR other_text IS NOT NULL)` |
| Capacity: `0 ≤ confirmed_seats ≤ max_passengers` and `max ≥ min` (BR-12) | `CHECK` on trips, programs and offers |
| Dates: `ends_at ≥ starts_at`, deadline `≤` start, `valid_to ≥ valid_from` | `CHECK` |
| No negative money; refunded `≤` paid; payment amount `> 0`; a percentage discount `≤ 100` | `CHECK` |
| A refund row always links to its payment, and only refunds do | `CHECK ((kind = 'REFUND') = (refund_of_id IS NOT NULL))` |
| Payments, audit entries and booking history are append-only (PAY-05, AUD-02) | `BEFORE UPDATE OR DELETE` triggers that raise an error |
| Each document number belongs to one customer | `UNIQUE (doc_type, doc_number, issuing_country_id)` |
| Every passenger of a trip, direct or via a program (BKG-10) | view `v_trip_passengers` |
| Booking and receipt numbers are gap-free per year | `number_sequences` upsert inside the transaction |

## Commands

```bash
npm run db:migrate        # apply migrations (prisma migrate deploy)
npm run db:seed           # demo data (refuses if data exists)
npm run db:reset          # drop everything, migrate and seed again (asks for confirmation)
npm run setup:install -w @travelos/api -- --office "…" --email … --password … --whatsapp …
```
