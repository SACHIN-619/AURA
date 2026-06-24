// server/utils/xp.js
//
// Honest XP point table — every entry corresponds to an action the backend
// can independently verify actually happened (a real DB write occurred).
// NOTHING here rewards an unverifiable real-world claim like "I got a
// haircut" — we have no way to confirm that without the salon's own POS
// system integrated, which doesn't exist. If we can't verify it server-side,
// it doesn't earn XP. This list is intentionally short and honest rather
// than long and fake.
export const XP_TABLE = {
  signup:                10,  // creating an account
  profile_completed:     15,  // added phone number (was optional, now filled in)
  first_ai_search:       10,  // used the AI concierge for the first time
  rating_submitted:      15,  // left a rating (any rating)
  rating_verified_bonus:  25, // bonus on top of the above IF the rating was
                               // AuraVerified (i.e. tied to a real Booking
                               // record) — this is the closest honest proxy
                               // we have to "actually visited," since it's
                               // backed by a real booking request, not a
                               // self-reported claim with no evidence.
  mirror_used:            5,  // tried AURA Mirror
  booking_request_sent:  10,  // sent a booking/WhatsApp request
};

// Level thresholds — simple, transparent, shown to the user exactly as-is.
const LEVEL_THRESHOLDS = [0, 25, 60, 120, 220, 400, 700];

export function levelForXp(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpToNextLevel(xp) {
  const currentLevel = levelForXp(xp);
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel]; // undefined at max level
  if (nextThreshold === undefined) return null; // already at max level
  return { current: xp, needed: nextThreshold, remaining: nextThreshold - xp };
}

// Awards XP and recalculates level — call this from any controller after a
// verified action. Never call this based on client-claimed events; only
// after the backend itself just confirmed a real write (e.g. right after
// Rating.create succeeds, not based on a "I rated it" flag from the client).
export async function awardXp(User, userIdOrEmail, action) {
  const points = XP_TABLE[action];
  if (!points) return null; // unknown action — silently no-op, never guess
  const filter = typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')
    ? { email: userIdOrEmail.toLowerCase().trim() }
    : { _id: userIdOrEmail };
  const user = await User.findOne(filter);
  if (!user) return null; // e.g. booking made without an account — no XP, that's correct
  user.xp = (user.xp || 0) + points;
  user.level = levelForXp(user.xp);
  await user.save();
  return { xpAwarded: points, totalXp: user.xp, level: user.level };
}
