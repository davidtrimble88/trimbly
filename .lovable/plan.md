
## What we're building

**My Garage** — a vehicle-focused companion module to Trimbly's home features. Homeowners (and any user) can add an optional add-on subscription to track cars and motorcycles the same way they track their home: maintenance schedules, service records, documents (registration, insurance, warranties), and pro lookups for mechanics.

It lives **side-by-side** with the homeowner dashboard — not mixed into it. A user with the add-on sees a "Garage" entry in their navbar/bottom nav that opens a dedicated Garage area with its own dashboard, sub-pages, and visual accent (still on-brand: primary green, but garage uses a subtle secondary "shop" tone so it feels distinct).

Pros are **not** changed in this pass — we'll surface existing auto/mechanic pros in Garage search, but no new pro onboarding flow.

## Scope — what gets built

### Subscription add-on
- New tier line item: **Garage Add-On** — $3.99/mo or $29/yr (final pricing to confirm with you).
- Stacks on top of any homeowner tier (Free, Pro, Multi-Home). Available to standalone users too (you don't need to own a home).
- Upsell surfaces:
  - Dashboard banner card ("Add My Garage — track your vehicles too")
  - Pricing page section
  - One-time post-signup nudge
- Gated by a single `has_garage_addon` check (RLS + UI).

### Garage section (dedicated area at `/garage`)
1. **Garage Dashboard** — overview of all vehicles, upcoming maintenance, document expirations (registration, inspection, insurance).
2. **My Vehicles** — add/edit cars and motorcycles. Fields: nickname, year/make/model/trim, VIN (optional), license plate, mileage, fuel type, purchase date, photo. VIN decode is a stretch — initial release is manual entry with a "decode VIN" button stub.
3. **Service Log** — per-vehicle log of past service (date, mileage, what was done, cost, shop/pro, receipt upload).
4. **Maintenance Schedule** — mileage- and time-based reminders (oil change, tire rotation, brakes, chain/sprocket for bikes, valve adjustment, etc.). Seeded from a default rules set; user can edit or add.
5. **Documents** — registration, insurance card, title, warranty, owner's manual. Mirrors the existing Home Binder UX/storage pattern.
6. **Find a Mechanic** — reuses existing provider search, scoped to auto/motorcycle categories. No new pro flow.

### Site/app entry points
- Navbar: a **Garage** link appears once the add-on is active (otherwise an "Add Garage" upsell pill).
- Mobile bottom nav: replace the least-used slot with **Garage** when active.
- Landing page: small "Now with My Garage" strip under the hero (low-key, not a placeholder/launch stat).
- SEO landing page at `/garage` for logged-out visitors explaining the add-on.

### What we are NOT building right now
- No mechanic onboarding/registration flow (existing pros only).
- No fuel/MPG tracking, no trip log, no expense reports.
- No marketplace for parts or Amazon-style affiliate yet (can add later, mirroring existing Amazon module).
- No insurance/claims chat — Coverage Advisor stays home-focused for now.
- No multi-garage / fleet features.

## Technical details

### Data model (new tables in Lovable Cloud)
- `vehicles` — owner_user_id, nickname, vehicle_type ('car'|'motorcycle'), year, make, model, trim, vin, license_plate, current_mileage, fuel_type, purchase_date, photo_url, notes, timestamps.
- `vehicle_service_records` — vehicle_id, service_date, mileage, service_type, description, cost, currency, shop_name, provider_id (nullable), receipt_url, timestamps.
- `vehicle_maintenance_tasks` — vehicle_id, task_name, interval_miles, interval_months, last_done_date, last_done_mileage, next_due_date, next_due_mileage, status, notes, timestamps.
- `vehicle_documents` — vehicle_id, doc_type ('registration'|'insurance'|'title'|'warranty'|'manual'|'other'), file_name, file_url, file_size, expires_on, timestamps.
- Storage bucket `vehicle-docs` (private, RLS-scoped).
- `garage_subscriptions` — user_id, status ('active'|'canceled'|'past_due'), started_at, current_period_end, plan_interval ('monthly'|'yearly'). Single source of truth for `has_garage_addon`.

All tables: RLS enabled, scoped to `owner_user_id = auth.uid()`, plus admin read via `has_role`. Explicit GRANTs to `authenticated` and `service_role` per project standards.

### Routes
- `/garage` — dashboard (gated)
- `/garage/vehicles` and `/garage/vehicles/:id`
- `/garage/maintenance`
- `/garage/documents`
- `/garage/mechanics` (provider search scoped to auto/moto)
- `/garage/upsell` — public landing/upsell page (no gate)

### Gating
- Reusable hook `useGarageSubscription()` returns `{ active, loading, plan }`.
- Reusable `<GarageGate>` wrapper component redirects non-subscribers to `/garage/upsell`.

### Payments
Garage is a paid add-on, so we'll need Stripe (Lovable's built-in seamless payments). I'll handle this as a separate follow-up step after the structural work is approved — enabling payments is its own confirmation flow. For now I'll mock `garage_subscriptions` so the gating logic is real and a staff-only toggle lets us flip a test user on.

### Reuse, don't duplicate
- Storage upload, file viewer, document expiration warnings → reuse Home Binder components, parameterized by bucket and table.
- Maintenance reminder engine → fork the existing `maintenance-reminders` edge function logic into a shared helper used by both home and vehicle tasks.
- Provider search UI → reuse `SearchPros` with a category filter prop.

### Visual treatment
Same brand (primary green, Plus Jakarta Sans/DM Sans). Garage pages get a subtle secondary surface tone and a wrench/car iconography set so the section feels distinct without breaking the design system.

## Rollout order
1. Migration: tables, RLS, grants, storage bucket, `garage_subscriptions` table.
2. Gating hook + upsell landing page + navbar/bottom-nav entry.
3. Vehicles CRUD + Garage dashboard shell.
4. Service log + maintenance schedule.
5. Documents.
6. Mechanic search scoping.
7. Payments wiring (separate approval step).

## Open questions before I build
1. Pricing — confirm $3.99/mo + $29/yr, or different?
2. Should the add-on also be available to **providers** (e.g. a handyman tracking their work truck), or homeowners/standalone users only?
3. For motorcycles, do you want the default maintenance schedule to include track-bike items (chain, valve adjust, fork oil) or just street-bike basics?
4. Do you want a free trial on the add-on (e.g. 14 days), or paid from day one?
