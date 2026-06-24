# AURA — Hyderabad Luxury Grooming Marketplace

AI Startup Buildathon 2026 submission. Full MERN stack salon marketplace built around one rule: **no fabricated data, anywhere.** Where real data doesn't exist (prices, star ratings from OSM), we say so honestly instead of inventing numbers.

## Quick start

```bash
# Backend
cp .env.example .env   # fill in MongoDB URI, JWT_SECRET, + at least one AI key
npm install
npm run dev            # → http://localhost:5000

# Frontend (new terminal)
cd client
npm install
npm run dev             # → http://localhost:3000

# Seed initial data
npm run seed             # from root — syncs all 8 Hyderabad hubs from OSM
```

## What's inside

**Discovery**
- Location-first onboarding — asks for location permission immediately, falls back to free-text search, never silently assumes a hub. Detects when you're outside Hyderabad's service area and says so.
- Live OSM data — real salon listings via Nominatim + Overpass API, with Ola Maps as a geocoding fallback if Nominatim fails (2-layer resilience for a critical path).
- Real category/gender filtering from actual OpenStreetMap tags — never a fabricated priced service menu.

**AI**
- AI Concierge — Gemini → Groq → HuggingFace → Krutrim 4-provider cascade, multi-turn conversation, location-aware "near me" search. Krutrim adds native Hindi/Telugu support.
- AURA Mirror — selfie upload with gender context + drag-to-crop, AI generates style recommendations (not a fixed list).

**Trust**
- AuraVerified ratings — real reviews tied server-side to actual Booking records; "verified" can never be claimed by the client.
- AURA Verified Listings — a separate badge, set only by an admin who manually confirmed the salon's basic info is accurate.
- Honest booking flow — WhatsApp-first when a real phone number exists, falls back to a logged "request" otherwise. Never fakes instant confirmation.

**Accounts**
- Real signup/login (bcrypt + JWT). Every account is created with `role: 'user'` — becoming an admin requires manually editing the database, never an API call.
- Profile photo upload (Cloudinary), password change, booking/rating history.
- Honest XP system — points only for actions the backend can verify happened (signup, first AI search, rating submitted, verified-rating bonus). Nothing rewards an unverifiable claim like "I got a haircut."

**Multi-language** — English, Hindi, Telugu, Urdu (with RTL layout) across the core flows.

**Admin dashboard** (`/admin`) — platform overview, rating moderation, listing verification, real analytics (views/clicks/searches/conversions), data-gap report by hub.

**Demo mode** — realistic fallback data if OSM/backend is unreachable, clearly labeled, never a blank screen.

## Deployment

**Frontend (Vercel):** set `VITE_API_URL` to your Render backend URL.
**Backend (Render):** set `CLIENT_ORIGIN` to your Vercel frontend URL, plus `MONGODB_URI`, `JWT_SECRET`, and at least one AI key.

That's it — one env var change each side.

See `server/README.md` and `client/README.md` for detailed setup, and `.notes/PENDING_FRONTEND_IDEAS.md` for what's intentionally scoped out for now.

