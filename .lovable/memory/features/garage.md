---
name: My Garage add-on
description: Optional paid add-on (cars + motorcycles) — vehicles, service log, maintenance schedule, documents, mechanic search; gated by garage_subscriptions
type: feature
---

My Garage is an optional paid add-on that mirrors the home-maintenance experience for vehicles.

- Pricing: $3.99/mo or $29/yr after 14-day free trial (confirm with founder before charging). Payments not yet wired — `/garage/upsell` activates a trial row directly for now.
- Tables: `vehicles`, `vehicle_service_records`, `vehicle_maintenance_tasks`, `vehicle_documents`, `garage_subscriptions`. All RLS-scoped to `owner_user_id = auth.uid()` with admin SELECT.
- Storage: private bucket `vehicle-docs`, per-user folder (`auth.uid()/...`).
- Gating: `useGarageSubscription()` hook + `<GarageGate>` component. SQL helper `public.has_garage_addon(uuid)`.
- Routes: `/garage` (gated layout) with `vehicles`, `vehicles/:id`, `maintenance`, `documents`, `mechanics`; `/garage/upsell` is the public landing/activation page.
- Default maintenance presets live in `src/lib/garage/maintenancePresets.ts` (car/motorcycle/truck variants) and are seeded on vehicle creation.
- Navbar shows "Garage" when active, otherwise "Add Garage" upsell pill. Mobile bottom nav adds Garage as a 5th tab when active.
- Mechanic search filters `providers` by auto/motorcycle categories; no new pro onboarding flow.
