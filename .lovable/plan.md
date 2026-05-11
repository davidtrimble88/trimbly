## Public Profiles for Homeowners & Pros

Let users and pros opt in to a public profile page that anyone can view via a shareable link.

### What each profile shows

**Homeowner profile** (`/u/:userId`)
- Avatar photo + display name + short bio
- Member since date
- Home locations — only the **city + state** of each home they've added (never the address)
- Stats: # of jobs posted, # of jobs completed (as homeowner), # of reviews written
- Toggle: "Make my profile public" (default OFF for privacy)

**Pro profile** (`/pro/:providerId`)
- Avatar/logo + business name + category + bio/description
- City + state (already on provider record)
- Years of experience, licensed/insured badges
- Stats: # of jobs completed, # of bids submitted, # of reviews received, average rating
- Photo gallery (up to ~8 portfolio pictures)
- Recent reviews list (already in `reviews` table)
- "Message this pro" button (uses existing message-first workflow)

### Database changes

Add to `profiles`:
- `bio text` — short user bio
- `is_public boolean default false` — opt-in flag for the public homeowner page
- `avatar_url` already exists ✓

Add to `providers`:
- `bio text` — longer description for the public page (kept separate from internal `description` so we don't break existing screens)
- `gallery_urls text[] default '{}'` — portfolio photos

New storage bucket: **`profile-images`** (public read), with RLS so users can only upload/delete inside their own `userId/...` folder. Used for both avatars and pro gallery photos.

RLS: public profile pages must work for **anonymous visitors**, so we'll add a SELECT policy on `profiles` already (`Users can view all profiles` exists ✓ but limited to authenticated). We'll widen to `{public}` so non-logged-in viewers can see public profiles. We then rely on the `is_public` flag at the application layer for homeowners — for pros, profiles are already public via the existing `providers` table policy.

Stat counts (jobs posted, jobs completed, bids, reviews) are computed live with COUNT queries — no schema needed.

### New pages & components

- `src/pages/PublicHomeownerProfile.tsx` — route `/u/:userId`, shows 404-style state if `is_public = false`
- `src/pages/PublicProviderProfile.tsx` — route `/pro/:providerId`, always public
- `src/components/profile/ProfileEditor.tsx` — used inside Dashboard ("Edit Public Profile" section) for avatar upload, bio, public toggle
- `src/components/profile/ProGalleryEditor.tsx` — used inside ProDashboard for gallery upload + bio
- `src/components/profile/StatsGrid.tsx` — shared stat tiles
- `src/components/profile/AvatarUpload.tsx` — shared image picker → uploads to `profile-images` bucket

### Dashboard integrations

- **Homeowner Dashboard** — add a "Public Profile" card with avatar, toggle, "View public profile" link, and an Edit button.
- **Pro Dashboard** — add a "Public Profile & Gallery" card with avatar/logo, bio, gallery uploader, and "View public profile" link.

### Routing

Add routes in `App.tsx`:
- `/u/:userId` → `PublicHomeownerProfile`
- `/pro/:providerId` → `PublicProviderProfile`

The existing search results / provider cards will be updated to link "View profile" to `/pro/:providerId` so the new page is discoverable.

### Privacy guardrails

- Homeowner profile is **off by default** and never reveals street address — only `home.city` and `home.state`.
- Pro phone numbers stay hidden behind the existing message-first / call-approval flow; no phone is shown on the public page.
- Email addresses are never displayed.

### Out of scope (can do later)

- Social-style follow/like
- Editing reviews from the profile page
- SEO sitemaps for public profiles
- Verifying job-completion counts beyond what's already in `jobs.status`

---

If this looks right I'll do the migration first (one approval), then ship the pages, components, dashboard cards, and routes in a second pass.