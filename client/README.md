# AURA Frontend — React + Vite

## Setup
```bash
npm install
npm run dev      # http://localhost:3000, proxies /api to :5000
npm run build    # production build → dist/
```

## Live Deployment

The client is deployed on Vercel: [https://aura-flax-two.vercel.app/](https://aura-flax-two.vercel.app/)

## Environment
Create a local `.env` file in the client directory:
```
VITE_API_URL=http://localhost:5000
VITE_MARKETPLACE_DEFAULT_CITY=Hyderabad
VITE_MARKETPLACE_DEFAULT_STATE=Telangana
VITE_MARKETPLACE_COUNTRY_FOCUS=India
VITE_ACTIVE_HUBS=Jubilee Hills,Banjara Hills,Hitech City,Gachibowli,Madhapur,Kondapur,Kukatpally,Ameerpet
VITE_MARKETPLACE_LANGUAGES=[{"code":"en","native":"English","label":"PRIMARY / IN"},{"code":"te","native":"తెలుగు","label":"REGIONAL / TS"},{"code":"hi","native":"हिन्दी","label":"NATIONAL / IN"},{"code":"ur","native":"اردو","label":"LOCAL / UR"},{"code":"mr","native":"मराठी","label":"WESTERN / MH"},{"code":"ta","native":"தமிழ்","label":"SOUTHERN / TN"},{"code":"kn","native":"ಕನ್ನಡ","label":"SOUTHERN / KA"},{"code":"bn","native":"বাংলা","label":"EASTERN / WB"}]
```
On Vercel, set these environment variables in your Vercel Project Settings, with `VITE_API_URL` pointing to the live Render backend: `https://aura-jdlt.onrender.com`.

## Routes
- `/` — main app
- `/admin` — internal admin dashboard (real email/password login, requires `role:'admin'` set directly in MongoDB)

## Component map

**Core shell**
- `App.jsx` — root, single AuraProvider + LanguageProvider, intro sequence, account button, mirror button
- `AuraContext.jsx` — global state, DB→OSM(+Ola Maps fallback)→demo data, distance-based ranking (no fake rating weighting)
- `ErrorBoundary.jsx` — catches render crashes

**Discovery**
- `LocationOnboarding.jsx` — pip → allow/search/skip flow, detects outside-service-area honestly
- `GlassSidebar.jsx` — responsive nav, hub list, real category/gender filters
- `AiBar.jsx` — search bar with autocomplete dropdown
- `SalonGrid.jsx` — paginated grid, skeleton loading, empty states
- `SalonCard.jsx` — redesigned card with visual hierarchy; real category tags, opening hours, contact icons, no fake pricing or ratings
- `icons.jsx` — shared line-icon set (replaces emoji for cross-browser consistency)

**Trust**
- `RatingDisplay.jsx` / `RatingModal.jsx` / `RateItButton.jsx` — real rating submission with live verification-eligibility check
- `VerifiedBadge.jsx` — gold tick, rating verification (tied to a real booking)
- `VerifiedListingBadge.jsx` — teal shield, listing verification (admin-confirmed info) — visually distinct on purpose

**Booking**
- `BookingModal.jsx` — WhatsApp-first when a real phone exists, logged-request fallback otherwise
- `BookingSuccess.jsx` — confirmation screen with real route distance/time, honest about "request" vs "confirmed"

**AI**
- `AuraMirror.jsx` — gender context → upload → drag-to-crop → AI style recommendations (no fixed style list)

**Accounts**
- `AuthModal.jsx` — signup/login (always creates `role:'user'`)
- `MyAccount.jsx` — booking/rating history, XP/level bar, avatar upload, password change
- `AdminDashboard.jsx` — `/admin` page: overview, analytics, moderation, listing verification, bookings, data gaps

**i18n**
- `i18n/LanguageContext.jsx` + `i18n/translations.js` — English/Hindi/Telugu/Urdu (RTL for Urdu). Adding a language is one new object in `translations.js`, no component changes needed.
- `LanguageSelector.jsx` — fixed top-right dropdown

## Theming
`tokens.js`'s `COLOR` object returns CSS variable references (`var(--c-gold)` etc), defined in `index.css` under `:root`, `[data-theme="light"]`, and `[data-theme="auto"]` (follows OS `prefers-color-scheme`). This lets every component that already uses `COLOR.*` respond to a theme change without being individually rewritten.

## Responsive breakpoints
- `≤900px`: sidebar collapses behind hamburger, single/2-col grid
- `≤600px`: top-right fixed UI (language selector, account button) stacks vertically instead of overlapping
- `≤480px`: single column grid
- All `clamp()` font sizes scale fluidly between breakpoints

## No hardcoding
Service categories come from `CATEGORY_LABELS` in `tokens.js`, which mirrors the backend's real OSM `beauty=*` tag extraction — not a fabricated priced menu. The only static data is `HUBS_FALLBACK` in `AuraContext.jsx`, used only when the backend itself is unreachable (and even then, it tries a live Nominatim settlement search before falling back to that array).
