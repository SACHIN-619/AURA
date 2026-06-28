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

**Discovery & Location Logic**
- Location-first onboarding — asks for location permission immediately, automatically uses GPS to map the user to the nearest verified hub, and falls back to a free-text search.
- Live Dynamic Hubs — Locations are dynamically fetched directly from the MongoDB database (`/api/salons/hubs`), eliminating hardcoded .env lists and ensuring the UI is always perfectly in sync with active salon data.
- AI-Powered Geocoding Fallback — When a user misspells a local place (e.g., "jubili hills"), the backend intelligently routes the query through an AI model to extract and map it to the correct regional hub.
- Hub-Centroid Distance Calculation — Displays accurate haversine distances relative to the selected hub center, ensuring contextual relevance even if live GPS isn't used.
- Live OSM data — real salon listings via Nominatim + Overpass API, with Ola Maps as a geocoding fallback if Nominatim fails (2-layer resilience for a critical path).
- Real category/gender filtering from actual OpenStreetMap tags — never a fabricated priced service menu.

**AI**
- AI Concierge — Gemini → Groq → HuggingFace → Krutrim 4-provider cascade, multi-turn conversation, location-aware "near me" search. Krutrim adds native Hindi/Telugu support.
- AURA Mirror — selfie upload with gender context + drag-to-crop, AI generates style recommendations (not a fixed list).

**Trust**
- AuraVerified ratings — real reviews tied server-side to actual Booking records; "verified" can never be claimed by the client.
- AURA Verified Listings — a separate badge, set only by an admin who manually confirmed the salon's basic info is accurate.
- Honest booking flow — WhatsApp-first when a real phone number exists, falls back to a logged "request" otherwise. Never fakes instant confirmation.

**Accounts & Ecosystem**
- Real signup/login (bcrypt + JWT). Every account is created with `role: 'user'` — becoming an admin requires manually editing the database, never an API call.
- User Dashboard & Owner Funnel — Premium dashboard showing bookings, history, and a seamless "Claim Your Shop" funnel designed to convert high-tier users into marketplace vendors.
- Owner CRM Interface — Once a user becomes an owner, they access a visually stunning glassmorphism dashboard to manage their salon, menu, and reviews.
- Honest XP system — points only for actions the backend can verify happened (signup, first AI search, rating submitted, verified-rating bonus). Nothing rewards an unverifiable claim like "I got a haircut."

**Multi-language** — English, Hindi, Telugu, Urdu (with RTL layout) across the core flows.

**Admin dashboard** (`/admin`) — platform overview, rating moderation, listing verification, real analytics (views/clicks/searches/conversions), data-gap report by hub.

**Demo mode** — realistic fallback data if OSM/backend is unreachable, clearly labeled, never a blank screen.

## Live Deployments & Environment

- **Frontend URL (Vercel):** [https://aura-flax-two.vercel.app/](https://aura-flax-two.vercel.app/)
- **Backend API URL (Render):** [https://aura-jdlt.onrender.com](https://aura-jdlt.onrender.com)
- **Database:** MongoDB Atlas (Cloud Cluster Instance)

### Deployment Configuration & Environment Variables

#### Frontend (Vercel)
- **VITE_API_URL**: Set to the Render backend URL: `https://aura-jdlt.onrender.com`
- **VITE_MARKETPLACE_LANGUAGES**: JSON array containing supported languages (English, Telugu, Hindi, Urdu, Marathi, Tamil, Kannada, Bengali).

#### Backend (Render)
- **CLIENT_ORIGIN**: Set to the Vercel frontend URL: `https://aura-flax-two.vercel.app`
- **MONGODB_URI**: MongoDB Atlas connection string.
- **JWT_SECRET**: Hashing secret key for JWT verification.
- **GEMINI_API_KEY**: Google Gemini model API key (primary AI concierge engine).
- **GROQ_API_KEY / HUGGINGFACE_API_KEY / KRUTRIM_API_KEY**: API keys for our 4-tier AI provider failover cascade.
- **CLOUDINARY_CLOUD_NAME**: Cloudinary account cloud name (for AuraMirror image uploads).
- **CLOUDINARY_API_KEY**: Cloudinary API key.
- **CLOUDINARY_API_SECRET**: Cloudinary API secret.

For detailed setup, see [client/README.md](file:///c:/Users/Sachin/Desktop/files/summer/aura-hyderabad-marketplace-final/aura-marketplace/client/README.md) and [server/README.md](file:///c:/Users/Sachin/Desktop/files/summer/aura-hyderabad-marketplace-final/aura-marketplace/server/README.md), and refer to `.notes/PENDING_FRONTEND_IDEAS.md` for scoped out concepts.


