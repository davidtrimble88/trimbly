# Equipment Rental Marketplace (Pro ↔ Pro)

A new section where service providers can list equipment they rent out to other providers, with messaging, contract generation, and search.

## Database (one migration)

**`equipment_rentals`**
- owner_provider_id, owner_user_id, title, description, category, condition
- price_hour, price_day, price_week (numeric, nullable — at least one required client-side)
- deposit_amount, currency (USD)
- city, state, postal_code, country, pickup_notes
- photo_urls (text[]), available (boolean, default true)
- min_rental_hours, max_rental_days, insurance_required (bool)
- terms (text — owner's custom terms)
- created_at, updated_at

RLS:
- Anyone authenticated can SELECT where `available = true` OR owner
- Owner can INSERT/UPDATE/DELETE own rows
- Admins manage all

**`rental_agreements`**
- rental_id, owner_user_id, renter_user_id, owner_provider_id, renter_provider_id
- start_date, end_date, rate_basis ('hour'|'day'|'week'), rate_amount, quantity
- subtotal, deposit, total
- terms_snapshot (text — copy of terms at signing)
- status ('draft','sent','accepted','declined','completed','cancelled')
- owner_signed_at, renter_signed_at, owner_signature (text/name), renter_signature
- created_at, updated_at

RLS: only parties can view/update; renter can accept/decline; owner creates.

**`rental_messages`** — reuse existing `messages` table with new optional `rental_id uuid` column (nullable, no FK to avoid coupling).

## Pages / Components

1. **`/equipment` (EquipmentRentals.tsx)** — public browse page (authenticated providers only).
   - Filters: search text, category, location (city/state), price range, rate basis.
   - Card grid showing photo, title, owner business, location, rates, "Rent / Message" buttons.
   - Only `available = true` shown.
   - Click → detail dialog with full info, photos, terms, message + request agreement buttons.

2. **`/equipment/manage` (MyEquipmentRentals.tsx)** — provider's own listings.
   - List + create/edit form (title, description, category, photos via existing `job-photos` bucket reused or simple URL field, all 3 rate fields, deposit, location, terms, available toggle).
   - Toggle available on/off inline.
   - Tab: incoming agreement requests.

3. **`RentalAgreementDialog.tsx`** — generates an agreement:
   - Pick dates, rate basis, quantity → auto-calc subtotal + deposit + total.
   - Shows terms snapshot, legal boilerplate (liability, insurance, indemnification, late fees, governing law placeholder), platform disclaimer.
   - Both parties type full name to e-sign; status flows draft→sent→accepted/declined→completed.
   - Renter views in same dialog from their inbox.

4. **Messaging** — reuse `messages` table; "Message owner" from rental card opens existing send-message flow with `subject` prefilled `"Re: <rental title>"`. Owner sees threads tagged with rental in ProDashboard messages section (light touch — just include rental title in subject for now).

5. **Pro Dashboard** — add cards/links: "My Equipment Rentals" + "Browse Equipment".

6. **Search** — client-side filter (text on title/description/category, location ilike, type, price).

## Legal / Protection

- Standard disclaimer in rental detail + agreement: "HomeHero is a venue only; not a party to the rental. Owner and renter are solely responsible for the equipment, condition, insurance, damages, and compliance with local laws."
- Terms snapshot frozen at agreement time.
- Required check for insurance acknowledgment when `insurance_required = true`.
- Deposit + total shown clearly; agreement requires both signatures.
- All transactions/payments handled offline between parties (no money flow through platform — reduces our liability). Note in UI.
- Audit trail via timestamps on agreement.

## Technical notes

- New route entries in `App.tsx`.
- Reuse `JobPhotoUploader` for rental photos (job-photos bucket is public).
- Add `equipment_rentals` and `rental_agreements` to realtime if time permits (not required).
- Use existing `useAuth`, provider lookup pattern from JobBoard.
- No edge functions needed.

Ready to build on approval.