// server/controllers/aiController.js
// AURA AI Concierge — multi-turn conversational chat, dynamic hub list,
// location-aware "near me" support, real OSM category filtering only.
import { generateStructuredJSON } from '../services/aiService.js';
import Salon from '../models/Salon.js';
import User from '../models/User.js';
import { OSM_BEAUTY_TAG_MAP } from '../utils/constants.js';
import { awardXp } from '../utils/xp.js';

const CATEGORY_LIST = [...new Set(Object.values(OSM_BEAUTY_TAG_MAP))].join(', ');

// Pull the real, currently-synced hub list from the DB at request time
async function getKnownHubs() {
  const hubs = await Salon.distinct('hub');
  return hubs;
}

function buildSystemPrompt(knownHubs, hasLocation) {
  const hubLine = knownHubs.length
    ? `Currently synced Hyderabad hubs: ${knownHubs.join(', ')}.`
    : `No hubs are synced yet — if the user names an area, pass it through as-is in searchParams.hub; do not invent hub names.`;
  const locLine = hasLocation
    ? `The user has shared their live location — if they say "near me" or similar, set searchParams.useUserLocation to true.`
    : `The user has NOT shared their location.`;

  return `You are the AURA Grooming Concierge for a Hyderabad beauty/salon marketplace. You speak warmly and naturally, like a knowledgeable local friend. You can hold a normal conversation — greet users, answer grooming questions, and give beauty tips — not just search for salons.

CRITICAL RULES:
1. AURA ONLY SERVES HYDERABAD. If a user asks for a location OUTSIDE Hyderabad (e.g., Mumbai, Delhi, Bangalore, USA, etc.), politely say you only cover Hyderabad and set "outOfService":true in searchParams.
2. If the user is making GENERAL CONVERSATION (greetings, asking how you are, grooming tips, general questions NOT asking to find a salon), respond naturally AND leave searchParams as an empty object {}. Do NOT search for salons just because someone says "hi" or "how are you".
3. Only search for salons when the user CLEARLY asks to find/book/discover/recommend a salon, barber, spa, or specific beauty service.
4. DO NOT ask for location if the user requests a service — search all hubs instead.
5. We do NOT have real pricing or star ratings. Never invent them.

${hubLine}
${locLine}

Real service categories we can filter by: ${CATEGORY_LIST}.

Respond ONLY with valid JSON, no markdown:
{"analysis":"your warm, natural reply — this is what the user sees","searchParams":{"hub":"hub name if salon search needed","category":"category if salon search needed","gender":"unisex|male|female if mentioned","useUserLocation":true/false,"outOfService":true/false}}
For general conversation/greetings, searchParams must be {} (empty object).`;
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
          $geometry: { type: 'Point', coordinates: [parseFloat(userLocation.lon), parseFloat(userLocation.lat)] },
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

  // Helper: reject OSM entries where the "name" is actually a phone number or node ID
  const isJunkName = (n) => !n || /^[\d\s\+\-\(\)]{7,}$/.test(n.trim()) || /^node\//i.test(n);

  let s = await Salon.find(filter).limit(48).lean();
  s = s.filter(salon => !isJunkName(salon.name)).slice(0, 24);
  let usedFallback = false;
  if (!s.length && p.hub) {
    const fallbackRaw = await Salon.find({ hub: filter.hub }).limit(48).lean();
    s = fallbackRaw.filter(salon => !isJunkName(salon.name)).slice(0, 24);
    usedFallback = s.length > 0;
  }
  if (!s.length) {
    const fallbackRaw = await Salon.find({}).limit(48).lean();
    s = fallbackRaw.filter(salon => !isJunkName(salon.name)).slice(0, 12);
    usedFallback = true;
  }
  return { salons: s, usedFallback };
}

export const chatQuery = async (req, res) => {
  const { message, history, userLocation, hubContext, email } = req.body;

  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ success: false, error: 'message required' });
  if (message.length > 500)
    return res.status(400).json({ success: false, error: 'message too long (max 500)' });

  try {
    const knownHubs = await getKnownHubs();
    const hasLocation = !!(userLocation?.lat && userLocation?.lon);
    const system = buildSystemPrompt(knownHubs, hasLocation);

    const historyText = Array.isArray(history) && history.length
      ? history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Concierge'}: ${h.content}`).join('\n') + '\n'
      : '';
    const fullUserTurn = `${historyText}User: ${message.trim()}`;

    // Execute through multi-provider interface layer
    const { parsed, provider } = await generateStructuredJSON(system, fullUserTurn);
    
    // Safety check ensuring the object and required analysis field exist
    if (!parsed || !parsed.analysis) {
      throw new Error('Invalid AI response structure: "analysis" field omitted');
    }

    const params = parsed.searchParams || {};
    
    // Detect out-of-service area
    const isOutOfService = params.outOfService === true || 
      (params.hub && !/hyderabad|secunderabad|cyberabad|telangana|hyd/i.test(params.hub) && 
       !knownHubs.some(kh => kh.toLowerCase() === params.hub.toLowerCase()));

    // Detect pure general conversation — no salon search needed
    // searchParams is empty {} OR only has outOfService flag
    const searchKeys = Object.keys(params).filter(k => k !== 'outOfService' && k !== 'useUserLocation');
    const hasSearchIntent = !isOutOfService && searchKeys.length > 0 && searchKeys.some(k => params[k]);

    let salons = [];
    let usedFallback = false;

    if (isOutOfService) {
      salons = [];
      params.outOfService = true;
    } else if (hasSearchIntent) {
      const result = await runSearch(params, userLocation);
      salons = result.salons;
      usedFallback = result.usedFallback;
    }
    // else: general conversation — salons stays []

    // Atomic XP update execution sequence
    let xpAwarded = 0;
    if (email) {
      const updated = await User.findOneAndUpdate(
        { email: email.toLowerCase().trim(), hasUsedAiSearch: { $ne: true } },
        { $set: { hasUsedAiSearch: true } },
        { new: false }
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
      return res.status(503).json({ 
        success: false, 
        error: 'No AI keys configured', 
        hint: 'Set GEMINI_API_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY, or KRUTRIM_API_KEY' 
      });
    }
    console.warn('[AI Concierge Alert] Cascade chain fallback triggered:', e.message);
    
    try {
      const isJunkName = (n) => !n || /^[\d\s\+\-\(\)]{7,}$/.test(n.trim()) || /^node\//i.test(n);
      const hubFilter = hubContext ? { hub: { $regex: hubContext.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' } } : {};
      const fallbackRaw = await Salon.find(hubFilter).limit(48).lean();
      let fallback = fallbackRaw.filter(salon => !isJunkName(salon.name)).slice(0, 12);
      
      if (!fallback.length && hubContext) {
        // If nothing found in that hub, fallback to any hub
        const secondaryRaw = await Salon.find({}).limit(48).lean();
        fallback = secondaryRaw.filter(salon => !isJunkName(salon.name)).slice(0, 12);
      }
      
      return res.json({
        success: true,
        message: `AURA Assistant is optimizing connections right now. Showing premier local salons ${hubContext ? `in ${hubContext}` : 'across Hyderabad'} instead — explore below!`,
        salons: fallback, 
        count: fallback.length, 
        aiProvider: null, 
        _fallback: true,
      });
    } catch (dbErr) {
      return res.status(500).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
};