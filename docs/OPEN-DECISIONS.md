# Open business decisions and the technical defaults in use

The Master Project Context (§26) asks us not to invent business rules. Where a choice was needed to build working software, a **technical default** was used.

Each default is reversible. None of them is a confirmed business requirement until the office owner approves it.

| # | Question | Default implemented | Where | To change |
|---|---|---|---|---|
| 1 | Does a confirmed booking need an initial payment? | **No.** A booking can be confirmed unpaid; the outstanding balance shows on the dashboard and in the reports. | `BookingsService.confirm` | Add a minimum-payment check before `reserveSeats` |
| 2 | Track supplier payments and balances? | **Yes** (decided by the owner). Dues = cost per person × confirmed passengers. Payments per trip are capped at cost × maximum seats. | `SuppliersService.pay`, trip `financials` | Whether advances above current dues are allowed |
| 3 | Cancellation and refund policy | **Manual.** Cancelling never refunds automatically; an authorised employee records refunds against the original payments. | `BookingsService.cancel / recordRefund` | Add policy percentages per tour |
| 4 | Can confirmed bookings be edited? | Notes and passenger details: **yes**. Passenger **count: no** (cancel and rebook). Pending and waiting-list bookings may change the count and are re-totalled with their original price snapshot. | `BookingsService.update` | — |
| 5 | Can offers overlap? | **No.** Overlapping active offers on the same trip are refused. A FIXED discount is **per person**; a PERCENTAGE applies to the booking subtotal. | `TripsService.assertOffer`, `pricing.ts` | Define how overlapping offers combine |
| 6 | Several hotels or providers across one tour's stages? | **No.** One supplier per service type per trip (confirmed for v1). | `@@unique([tripId, serviceType])` | — |
| 7 | Exact permissions per role | Two default roles. **Admin**: everything, office-wide. **Reception**: own branch; customers, bookings, cash payments, operational reports; no refunds, no financial reports, no staff or settings. Roles are editable per office. | `@travelos/shared` `DEFAULT_ROLES` | Edit in the Roles screen |
| 8 | Subscription plans and billing | **Not implemented.** The platform admin can onboard, activate and deactivate offices. | `PlatformModule` | — |
| 9 | Trip status transitions | `DRAFT → OPEN` (needs priced services) → `REGISTRATION_CLOSED` automatically at the deadline → admin **APPROVE / EXTEND / CANCEL** → `APPROVED → COMPLETED` after the return date. `OPEN → DRAFT` only without bookings. New bookings need `OPEN`; confirming existing pending bookings is allowed until the trip is completed or cancelled. | `TripsService` | — |
| 10 | Booking count above registered passengers during a draft? | **No.** The passenger count is always the number of passenger records. | `CreateBookingDto.passengers` | — |
| 11 | Are customers shared across branches? | **Yes**, a customer belongs to the office, so a returning customer is found at any branch. Their bookings and balances shown to a branch-scoped user only include that branch. | `CustomersService` | — |
| 12 | Which services are required before opening registration? | **At least one** priced service. | `TripsService.open` | Require e.g. TRANSPORT |
| 13 | When are external hotel and transport reservations made? | **Pending the API documentation.** See `docs/integrations/README.md` §9. | — | — |
| 14 | Landing page across offices | **Showcase.** Only offices that enable their public page appear; no checkout; "Book now" opens the office's WhatsApp. Each office also has its own page. (Decided by the owner.) | `PublicPagesModule` | — |
| 15 | PDF generation | Printable pages in the web app ("Save as PDF"), because server PDF libraries do not shape Arabic correctly. Excel is produced by the API (ExcelJS, right-to-left sheets). | web print views, `ReportsService.toExcel` | — |
