# AURA Backend — Express + MongoDB

## Setup
```bash
cp ../.env.example ../.env  # fill values
npm install
npm run dev      # nodemon, port 5000
npm run seed     # populate all 8 hubs from OSM
npm test         # 93 smoke tests
```

## Environment variables
| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | Yes | Local or Atlas connection string |
| `JWT_SECRET` | Yes | Long random string — required for signup/login |
| `GEMINI_API_KEY` | One of four | aistudio.google.com — free |
| `GROQ_API_KEY` | One of four | console.groq.com — free |
| `HUGGINGFACE_API_KEY` | One of four | huggingface.co — free |
| `KRUTRIM_API_KEY` | One of four | olakrutrim.com — free, native Hindi/Telugu |
| `OLA_MAPS_API_KEY` | Recommended | geocoding fallback if Nominatim fails |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Optional | avatar uploads — clear error if unset |
| `CLIENT_ORIGIN` | Prod only | Vercel frontend URL |
| `APP_USER_AGENT` | Recommended | Required by Nominatim ToS |

At least one of the four AI keys must be set for the AI Concierge and AURA Mirror to work.

## API endpoints

**Salons & search**
- `POST /api/sync/hub` — sync salons for a hub from OSM (Nominatim → Ola Maps fallback)
- `GET /api/salons` — list salons (filterable by hub/category/gender)
- `GET /api/salons/hubs` — hub list with live-computed centroid coordinates
- `GET /api/search/autocomplete` — search suggestions

**AI**
- `POST /api/chat/query` — AI concierge, multi-turn, location-aware
- `POST /api/mirror/analyze` — selfie style analysis (gender-aware)

**Bookings & ratings**
- `POST /api/bookings` — create a booking/request
- `PATCH /api/bookings/:id/cancel` — cancel
- `POST /api/ratings` — submit a rating (server verifies booking history for the AuraVerified badge)
- `GET /api/ratings/salon/:salonId` — real aggregate stats + recent reviews
- `GET /api/ratings/eligibility` — checks if an email qualifies for a verified rating

**Auth & account**
- `POST /api/auth/signup` / `POST /api/auth/login` — bcrypt + JWT, always creates `role:'user'`
- `GET /api/auth/me` — current account from JWT
- `PATCH /api/auth/password` — change password (requires current password)
- `PATCH /api/auth/avatar` / `DELETE /api/auth/avatar` — Cloudinary profile photo
- `GET /api/users/profile` — booking + rating history (JWT-protected, your own data only)
- `DELETE /api/users` — GDPR account deletion (JWT-protected)

**Admin** (`requireAuth` + `requireAdmin` — role must be `'admin'` in MongoDB)
- `GET /api/admin/overview` — platform counts + data coverage %
- `GET /api/admin/analytics` — real 30-day traffic/conversion data
- `GET /api/admin/moderation-queue` / `PATCH /api/ratings/:id/moderate` — rating moderation
- `GET /api/admin/listings/unverified` / `PATCH /api/admin/listings/:id/verify` — listing verification
- `GET /api/admin/data-gaps` — per-hub category/contact coverage

- `GET /health` — status check

## Architecture decisions
- ESM throughout (`"type":"module"`)
- 3-tier salon data fallback: DB → OSM sync (with Ola Maps geocode fallback) → demo data, clearly labeled
- AI cascade: Gemini → Groq → HuggingFace → Krutrim (auto-failover)
- **No fabricated data anywhere**: no fake star ratings, no fake review counts, no invented prices. `Salon.luxuryRating`/`reviewCount` are explicitly nullable and flagged `ratingSource: 'synthetic_placeholder'` until real review data exists.
- Real auth: bcrypt-hashed passwords, JWT, role is never client-settable — promotion to admin requires a direct MongoDB edit
- AuraVerified ratings are tied server-side to a real Booking record — `isVerified` can never be claimed by the client
- AURA Verified Listings (separate from rating verification) are set only by an authenticated admin
- XP system rewards only server-confirmed actions — nothing for unverifiable self-reported claims
- Booking is honest: WhatsApp-first when a real phone number exists, otherwise a logged "request" with no fake instant confirmation

## Testing
`npm test` runs 93 checks covering ESM compliance, no hardcoded data, and specific security/honesty regressions (e.g. "role can never be set from client input", "conversion rate is null not fabricated when no data exists").
