// server/controllers/aiController.js
// AURA AI Concierge — multi-turn conversational chat, dynamic hub list,
// location-aware "near me" support, real OSM category filtering only.
import { generateStructuredJSON } from '../services/aiService.js';
import Salon from '../models/Salon.js';
import User from '../models/User.js';
import { OSM_BEAUTY_TAG_MAP } from '../utils/constants.js';
import { awardXp } from '../utils/xp.js';

const CATEGORY_LIST = [...new Set(Object.values(OSM_BEAUTY_TAG_MAP))].join(', ');

// Pull the real, currently-synced hub list from the DB at request time —
// never a hardcoded string baked into the prompt. If nothing is synced yet,
// the AI is told that honestly so it doesn't invent hub names.
async function getKnownHubs() {
  const hubs = await Salon.distinct('hub');
  return hubs;
}

function buildSystemPrompt(knownHubs, hasLocation) {
  const hubLine = knownHubs.length
    ? `Currently synced Hyderabad hubs: ${knownHubs.join(', ')}.`
    : `No hubs are synced yet — if the user names an area, pass it through as-is in searchParams.hub; do not invent hub names.`;
  const locLine = hasLocation
    ? `The user has shared their live location — if they say "near me" or similar, set searchParams.useUserLocation to true instead of guessing a hub.`
    : `The user has NOT shared their location. If they say "near me", ask them (in your "analysis" reply) to share location or name an area — do not guess a hub.`;

  return `You are the AURA Grooming Concierge for a Hyderabad beauty/salon marketplace. You speak warmly and naturally, like a knowledgeable local friend — not a search form.

${hubLine}
${locLine}

Real service categories we can filter by (derived from actual OpenStreetMap tags — nothing else exists): ${CATEGORY_LIST}.
We do NOT have real pricing data for salons (OpenStreetMap doesn't carry menus/prices) — never claim a price, never invent one. If asked about price, say honestly that pricing isn't listed yet and the salon should be contacted directly.
We do NOT have real star ratings yet either — don't claim a salon is "top-rated" or "best" unless the user explicitly only wants OSM-tagged categories matched; phrase recommendations around location, category match, and gender-served tags only.

Continue the conversation naturally using the history provided. Ask a clarifying question in "analysis" if the request is ambiguous (e.g. unclear area, unclear service) rather than guessing.

Respond ONLY with valid JSON, no markdown:
{"analysis":"your natural, warm reply to the user — this is what they will read","searchParams":{"hub":"exact hub name if mentioned","category":"one of the real categories above if mentioned","gender":"unisex|male|female if mentioned","useUserLocation":true}}
Omit any searchParams field not clearly implied. searchParams can be {} if you're just asking a clarifying question and not ready to search yet.`;
}

async function runSearch(p, userLocation) {
  const filter = {};
  if (p.category) filter.serviceCategories = p.category;
  if (p.gender && p.gender !== 'any') filter.servesGender = p.gender;

  // "Near me" — geo query using the user's actual shared coordinates
  if (p.useUserLocation && userLocation?.lat && userLocation?.lon) {
    const geoFilter = {
      ...filter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [userLocation.lon, userLocation.lat] },
          $maxDistance: 15000, // 15km
        },
      },
    };
    const near = await Salon.find(geoFilter).limit(24).lean();
    if (near.length) return { salons: near, usedFallback: false };
  }

  if (p.hub) {
    filter.hub = { $regex: p.hub.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' };
  }

  let s = await Salon.find(filter).limit(24).lean();
  let usedFallback = false;
  if (!s.length && p.hub) {
    s = await Salon.find({ hub: filter.hub }).limit(24).lean();
    usedFallback = s.length > 0;
  }
  if (!s.length) {
    s = await Salon.find({}).limit(12).lean();
    usedFallback = true;
  }
  return { salons: s, usedFallback };
}

export const chatQuery = async (req, res) => {
  // history: optional array of {role:'user'|'assistant', content:string} from
  // previous turns in this conversation — enables real multi-turn chat.
  // email is optional — AI search works fully anonymously; XP only applies
  // when we know which real account to credit.
  const { message, history, userLocation, email } = req.body;

  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ success: false, error: 'message required' });
  if (message.length > 500)
    return res.status(400).json({ success: false, error: 'message too long (max 500)' });

  try {
    const knownHubs = await getKnownHubs();
    const hasLocation = !!(userLocation?.lat && userLocation?.lon);
    const system = buildSystemPrompt(knownHubs, hasLocation);

    // Fold conversation history into the prompt sent to the AI service —
    // generateStructuredJSON takes a single userMessage string, so we
    // serialize prior turns compactly ahead of the current message.
    const historyText = Array.isArray(history) && history.length
      ? history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Concierge'}: ${h.content}`).join('\n') + '\n'
      : '';
    const fullUserTurn = `${historyText}User: ${message.trim()}`;

    const { parsed, provider } = await generateStructuredJSON(system, fullUserTurn);
    if (!parsed.analysis) throw new Error('Invalid AI response structure');

    const params = parsed.searchParams || {};
    const hasSearchIntent = Object.keys(params).length > 0;

    let salons = [];
    let usedFallback = false;
    if (hasSearchIntent) {
      const result = await runSearch(params, userLocation);
      salons = result.salons;
      usedFallback = result.usedFallback;
    }

    // First-ever AI search XP — uses a one-time flag on the User document
    // (set atomically so two concurrent requests can't double-award), not
    // a scan of analytics history which has no reliable user identity yet.
    let xpAwarded = 0;
    if (email) {
      const updated = await User.findOneAndUpdate(
        { email: email.toLowerCase().trim(), hasUsedAiSearch: { $ne: true } },
        { $set: { hasUsedAiSearch: true } },
        { new: false } // we only care whether the match succeeded
      );
      if (updated) {
        const xp = await awardXp(User, email, 'first_ai_search');
        if (xp) xpAwarded = xp.xpAwarded;
      }
    }

    return res.json({
      success: true,
      message: parsed.analysis,
      searchParams: params,
      salons,
      count: salons.length,
      aiProvider: provider,
      usedFallback,
      xpAwarded,
    });
  } catch (e) {
    if (e.message?.includes('No AI providers')) {
      return res.status(503).json({ success: false, error: 'No AI keys configured', hint: 'Set GEMINI_API_KEY, GROQ_API_KEY or HUGGINGFACE_API_KEY' });
    }
    console.warn('[AI Concierge] All providers failed:', e.message);
    try {
      const fallback = await Salon.find({}).limit(12).lean();
      return res.json({
        success: true,
        message: `AI assistant is temporarily unavailable (${e.message.slice(0, 80)}). Showing recent salons instead — try browsing by hub in the sidebar.`,
        salons: fallback, count: fallback.length, aiProvider: null, _fallback: true,
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
};
