# FulfillOS device experience audit and delivery plan

## Product principle

- Desktop is for deciding.
- Mobile is for executing.
- Stations are for repetitive operational workflows.

All modes remain part of the same Next.js and Supabase application. They share authentication, tenant isolation, roles, operational events, evidence, billing capture, inventory history, and exceptions.

## Repository and production schema audit

### Existing and reusable

- Supabase SSR authentication with email/password and Google OAuth.
- Organization membership with `owner`, `admin`, `manager`, `operator`, and `viewer` roles.
- Organization-scoped customers, products, warehouses, and hierarchical warehouse locations.
- Expected inbound shipments and shipment items.
- Atomic `receive_inbound_units` database function with an idempotency key.
- Append-only `operational_events` and `inventory_movements`.
- `proof_of_work_evidence`, `billable_events`, `exception_cases`, and immutable `audit_events`.
- RLS policies for organization members and operation/management roles.
- Deterministic inbound exceptions in the Control Tower.
- HID-style scanner testing for SKU, barcode, ASIN, and FNSKU.
- Team profiles that associate employee names with authenticated user IDs.

### Gaps found

- The atomic receiving function existed but was not connected to an application workflow.
- Operators entered the management dashboard instead of an execution-focused home.
- Mobile navigation exposed too many management destinations.
- Prep and outbound pages are planning/readiness views, not executable work ledgers yet.
- Move, Count, Pick, Report Problem, and Packing Station do not yet have controlled backend operations.
- Photo evidence storage and organization-scoped Storage policies are not versioned in this repository.
- Production operational tables and functions predate the local migrations currently checked into the repository; their definitions should be captured in a future schema-baseline migration without recreating or dropping production objects.
- The application did not provide a PWA manifest or service-worker registration.

## Implemented first increment

- Added role-driven Floor Mode without user-agent detection.
- Operators redirect from `/dashboard` to `/floor`; managers may switch modes explicitly.
- Added a touch-first Floor home with honest availability states.
- Added an open-inbound selector optimized for phones and handhelds.
- Added location and product scan inputs that accept Enter-terminated HID scanner input and retain focus.
- Connected receiving to the existing `receive_inbound_units` RPC through an authenticated, organization-validated route.
- Preserved a stable idempotency key across retry attempts.
- Added explicit server-confirmed success and explicit “NOT recorded” connection/error states.
- Added total received and damaged-within-total quantity semantics.
- Required a damage note until secure photo evidence is implemented.
- Added worker identity, warehouse context, and a simplified Floor navigation.
- Added installable PWA metadata and a network-only service worker. Critical writes are never silently queued offline.

## Next safe increments

1. Add organization-scoped Supabase Storage policies and photo evidence for damaged receiving and exception resolution.
2. Add controlled RPCs for inventory Move and Count; never update balances directly.
3. Persist exceptions and resolution lifecycle in `exception_cases` rather than deriving every view at render time.
4. Add executable work orders and billable prep completion events before enabling Floor Prep actions.
5. Add outbound allocations and immutable inventory consumption before Pick and Packing Station.
6. Build Station Mode around the first complete outbound workflow: scan, verify, weigh, print-ready output, and close.
7. Capture the existing production schema/functions as a backward-safe migration baseline and add automated database tests for exact receipt, shortage, overage, damage, idempotent retry, and wrong-organization access.

## Safety decisions

- No duplicate receiving implementation was created.
- No RLS policy was disabled or weakened.
- No direct inventory update was added.
- No fake camera, printer, scale, or AI integration is shown as functional.
- No offline success is displayed before the server commits the transaction.
- Unfinished Floor actions are visibly unavailable rather than linking to fake workflows.
