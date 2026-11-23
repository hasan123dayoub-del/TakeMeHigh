# Open decisions

The SRS lists 23 open items in Appendix C (TBD-01 to TBD-23). The owner asked to build with the **provisional assumptions**. This page records how each one is implemented and how to change it later.

| # | Question | Implemented as | To change it |
|---|---|---|---|
| TBD-01 | Hosting ("online, not cloud") | One installation per client on its own server, reached through the browser. `npm run setup:install` creates the first Admin. | Deployment only |
| TBD-02 | The suppliers' API documentation | A generic REST contract v1 plus a built-in sandbox supplier (`docs/integrations`) | Add an adapter in `integrations/adapters.ts` |
| TBD-03 | Booking from another departure point | The same base price plus the pickup point's `surcharge`, which only the Admin sets | `trip_pickup_points.surcharge` |
| TBD-04 | Can a trip be sold alone and also inside programs? | Yes. A trip can be a leg of several programs. | — |
| TBD-05 | Who builds trips; who sees costs; profit on programs | The Admin does everything. A branch manager builds own-branch trips with the default profit. Only the Admin sees costs and profit. No extra profit on programs. | Roles page (`pricing.view_breakdown`, `pricing.set_profit`) |
| TBD-06 | Currencies | One currency per trip, program and bundle, with no conversion. Statistics are kept per currency. | — |
| TBD-07 | When can a booking be confirmed? | After the first payment, and only with complete documents | Settings → `confirmRequiresPayment` |
| TBD-08 | Can a branch see other branches' customers? | No. Only customers registered in the branch or booked through it. | `customers.service` scope |
| TBD-09 | Visa fee; passport validity | An optional fee on each visa record. The passport must be valid 6 months after the trip. | Settings → `passportValidityMonths` |
| TBD-10 | Payment methods; refunds | Cash only. Refunds are done by the Admin, with a reason, and linked to the original payment. | Add a value to `PaymentMethod` |
| TBD-11 | The guide's dashboard before the mobile app | Assigned trips, the passenger lists, attendance and notes | Roles page |
| TBD-12 | Realized profit | Profit of bookings on finished products that are fully paid | `reports.service` |
| TBD-13 | Stacking offers | Offers never stack; the best live discount wins | `rules.bestDiscount` |
| TBD-14 | Trip categories | Cultural and religious, as in the brief; the Admin adds more | Categories page |
| TBD-15 | "Other" for staff | Only the public request form accepts "Other"; staff add the company first | — |
| TBD-16 | A company with several services | One service per company; add it twice if needed | — |
| TBD-17 | Notification channels; CAPTCHA | In-dashboard notifications. The public form uses a honeypot and a limit of 5 per hour per visitor. | Add an email/SMS adapter |
| TBD-18 | Receipt format | An A5 PDF printed from the browser, with yearly gap-free numbers (`RCP-2026-000123`) | — |
| TBD-19 | Hotel occupancy and stars | The supplier's cost per person per night, multiplied by the number of nights; stars kept on the company | — |
| TBD-20 | Airlines and airports | Air transport companies with city-to-city items; dedicated tables come later | — |
| TBD-21 | Several managers per branch; shared trips | Allowed. Trips with no branch are shared by all branches. | — |
| TBD-22 | Languages | Arabic (RTL) first, plus English throughout | — |
| TBD-23 | Licensing and updates | No operational duty for the developer after delivery | Contract |
