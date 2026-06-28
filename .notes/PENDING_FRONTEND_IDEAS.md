# Pending Frontend Ideas — captured, not yet built
(Backend is being finished first. This file tracks every idea so nothing
gets lost between sessions. Each item gets moved to "decided" with a real
plan before any code is written.)

## 1. "Auto" theme = cinematic mid-tone mode (NOT just OS light/dark passthrough)
User wants the THIRD theme option to be its own distinct aesthetic:
- Off-black / deep charcoal / warm taupe backgrounds (not pure black/white)
- Muted desaturated accents (frosted blue, sage, lavender) instead of gold-only
- Soft cream/silver text, not glaring white
- Asymmetric, bleeding-edge layout; bento-box floating cards at different depths
- Inertial/physics-based scroll easing (Lenis/Locomotive-style), not default browser scroll
- Scroll-triggered parallax (background slow, foreground matches swipe speed)
- Magnetic button/link hover (elements pull toward cursor proximity)
DECISION NEEDED: this is a genuinely large feature (smooth-scroll library +
parallax engine + new palette + magnetic cursor physics) — likely its own
multi-step build, not a quick CSS variable swap like light/dark was.
STATUS: not started. Plan to scope as its own dedicated pass after backend.

## 2. Card images — still unresolved per user
Question raised: "how are you going to get images for cards, famous places
according to proximity of user location?"
Current state: Picsum seeded placeholder photos (deterministic per salon,
NOT real photos of the actual place). User has flagged this is unresolved.
Need to decide: stay with honest placeholder + clear "illustrative photo"
label, OR explore card-free image sources further (note: TomTom POI photos
are sparse per their own docs; Foursquare/Yelp require cards we don't have).
STATUS: open question — likely staying honest-placeholder unless a real
zero-cost photo source surfaces.

## 3. Sidebar city/area search → view shops there
Already exists: GlassSidebar has a hub search box + LocationOnboarding has
area search via Nominatim. 
STATUS: **DONE**. We completely overhauled the Location Onboarding with a GPS "Find Salons Near Me" button and dynamic database-driven hub searches (hitting `/api/salons/hubs`), removing reliance on `.env` files entirely.

## 4. Price ranges + AuraVerified trademark logo
User asks: when admin verifies a salon, does it get a trademark/AuraVerified
logo? We already built VerifiedBadge.jsx (gold tick) for RATINGS specifically
(tied to a real booking). User may be asking for a SEPARATE verification tier
— e.g. "admin manually confirmed this salon's contact info / category / even
price range is accurate" — a different badge meaning than "this rating came
from a verified booking."
DECISION NEEDED: Do we want a second badge type — "AURA Verified Listing"
(admin confirmed the salon's basic info, distinct from rating verification)?
If yes: needs a new boolean field on Salon model + admin UI action to set it.
STATUS: not started — needs explicit decision before building.

## 5. What does a logged-in user actually GET vs a non-logged-in user?
User is asking us to explicitly DEFINE this distinction — currently auth
exists (signup/login/JWT) but nothing in the app actually changes behavior
based on whether someone is logged in. Booking/rating currently work fully
WITHOUT an account (email captured ad-hoc each time).
NEEDS DECISION — proposed split:
  Without login: full browse, AI search, WhatsApp contact, can book/rate
    by typing email each time (current behavior, unchanged).
  With login: bookings/ratings auto-attached to account (no retyping email),
    a "My Bookings" + "My Ratings" history view, saved preferred hubs.
  Admin: separate role, dashboard only, decided already.
STATUS: not started — this is real scope, needs a "My Account" page.

## 6. JustDial-style intent popup ("what are you looking for?") on scroll/idle
User wants: detect user scrolling with no action / idle / confusion signal,
then show a popup: "What are you looking for?" with a service-category
dropdown + "Book a session" CTA + encourage login, tied to notification or
WhatsApp follow-up.
STATUS: not started — this is a real, buildable feature (scroll-idle
detection + modal), should be scoped after auth/account pages exist since
the popup's CTA depends on having a real account system to push toward.

## 7. SEO
User flagged this needs attention — currently zero SEO work done (no meta
tags beyond the basics already in index.html, no sitemap, no structured
data/schema.org markup for LocalBusiness, no SSR/prerendering — this is a
client-rendered SPA which is inherently SEO-weak without extra work).
STATUS: not started.

---
ORDER OF OPERATIONS (agreed): finish backend completely → return to this
list → discuss/decide each item before building → never claim "done" without
a real build+test pass.
