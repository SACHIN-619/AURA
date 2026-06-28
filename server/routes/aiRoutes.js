import express from 'express';
import rateLimit from 'express-rate-limit';
import { chatQuery } from '../controllers/aiController.js';
import { queryYourGeminiModel } from '../services/aiService.js';
import Salon from '../models/Salon.js';
import Translation from '../models/Translation.js';

const router = express.Router();

// Optimized rate limiter: 30 requests per minute with dynamic fallback headers
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'production' ? 30 : 100, // Looser restrictions in development mode
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'AURA AI Concierge is experiencing high traffic. Please wait a moment before sending another request.',
    fallbackRouted: !!(process.env.GROQ_API_KEY || process.env.HUGGINGFACE_API_KEY) // Flags to client if backup routing is available
  }
});

// Primary interactive chat engine route
router.post('/query', aiRateLimiter, chatQuery);

router.post('/localize-languages', async (req, res) => {
  try {
    const { contextHubs } = req.body;

    // Use your internal Gemini setup to evaluate the dynamic language list
    const prompt = `You are a localized marketplace translation assistant. ` +
      `Given these active geographical operational areas: "${contextHubs}", generate a list of the top relevant Indian languages standard users would expect. ` +
      `Always include English, Hindi, and the primary regional language matching these hubs first, followed by other major historical cultural languages of that demographic. ` +
      `Format the response as a strict JSON array of objects with keys "code", "native", and "label". ` +
      `Do not output any markdown code blocks, text wrapper, or explanations. Only raw JSON. ` +
      `Example output format: [{"code":"en","native":"English","label":"Primary"},{"code":"te","native":"తెలుగు","label":"Regional"}]`;

    const aiOutput = await queryYourGeminiModel({ prompt });
    const computedLanguages = JSON.parse(aiOutput.trim());

    res.json({ success: true, languages: computedLanguages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ success: false, error: 'text and targetLang are required' });
    }
    
    const cleanText = text.trim();
    if (targetLang === 'en') {
      return res.json({ success: true, translatedText: cleanText });
    }

    // 1. Check if translation exists in the database
    const existing = await Translation.findOne({ text: cleanText, lang: targetLang });
    if (existing) {
      return res.json({ success: true, translatedText: existing.translation });
    }

    // 2. Query AI model if not found
    const prompt = `Translate the following text into the language represented by the code "${targetLang}" (e.g. "te" is Telugu, "hi" is Hindi, "ur" is Urdu, etc.). ` +
      `Translate it naturally as a localized marketplace UI string. ` +
      `Respond with ONLY the exact translated text. Do not add markdown code blocks, quotes, formatting, or any explanations.\n\n` +
      `Text to translate: "${cleanText}"`;

    const translatedTextRaw = await queryYourGeminiModel({ prompt });
    const translatedText = translatedTextRaw.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();

    // 3. Save to database for permanent retrieval
    try {
      await Translation.create({ text: cleanText, lang: targetLang, translation: translatedText });
    } catch (saveErr) {
      console.warn('Failed to save translation cache to DB:', saveErr.message);
    }

    res.json({ success: true, translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/enrich-salon', async (req, res) => {
  try {
    const { salonId, name, hub } = req.body;
    if (!salonId) {
      return res.status(400).json({ success: false, error: 'salonId is required' });
    }

    let salon = null;
    if (salonId.match(/^[0-9a-fA-F]{24}$/)) {
      salon = await Salon.findById(salonId);
    }
    
    // For valid DB salons that already have data
    if (salon && salon.aiResearchData && salon.aiResearchData.summary) {
      return res.json({ success: true, enriched: salon.aiResearchData });
    }

    const prompt = `Given the luxury salon "${name}" located in the area "${hub}" in Hyderabad, ` +
      `generate a simple, clean, and understandable one-sentence summary of what this salon offers for a marketplace user. Do not use overly complex or flowery words like "opulent pampering". ` +
      `Also estimate a reasonable starting entry price in Rupees (e.g., "₹600+", "₹1200+", "₹2000+" depending on how upscale the salon name sounds). ` +
      `Furthermore, based on the salon's name and the general area '${hub}', deduce a more precise specific local neighborhood, landmark, or street name within '${hub}' where this salon is likely located to prove authenticity. If you don't know, provide a plausible precise area inside ${hub}. ` +
      `Format your response as a strict JSON object with keys "summary", "estimatedBasePrice", and "preciseLocation". ` +
      `Do not output any markdown code blocks, text wrapper, or explanations. Only raw JSON. ` +
      `Example format: {"summary":"A modern grooming lounge in Jubilee Hills offering high-quality haircuts and styling.","estimatedBasePrice":"₹1200+","preciseLocation":"Near Checkpost, Jubilee Hills"}`;

    const aiOutput = await queryYourGeminiModel({ prompt });
    let enriched = { summary: '', estimatedBasePrice: '₹500+', preciseLocation: '' };
    try {
      const cleaned = aiOutput.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.summary) enriched.summary = parsed.summary;
      if (parsed.estimatedBasePrice) enriched.estimatedBasePrice = parsed.estimatedBasePrice;
      if (parsed.preciseLocation) enriched.preciseLocation = parsed.preciseLocation;
    } catch (parseErr) {
      console.warn('Failed to parse AI salon enrichment response:', aiOutput, parseErr);
      enriched.summary = `${name} is a premier styling lounge in ${hub} offering bespoke luxury grooming.`;
    }

    if (salon) {
      salon.aiResearchData = enriched;
      await salon.save();
    }

    res.json({ success: true, enriched });
  } catch (error) {
    console.error('Salon enrichment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-salon-booking', async (req, res) => {
  try {
    const { salonId, name, hub, tier, priceTier, service } = req.body;
    
    // Use Gemini to analyze if the price/details seem suspiciously low or outdated for the given hub & tier.
    const prompt = `You are a data validation AI for AURA, a salon marketplace. A user is about to book a salon with these details:
    Salon Name: ${name}
    Location/Hub: ${hub}
    AURA Tier: ${tier || 'unrated'}
    Price Tier: ${priceTier || 'Moderate'}
    Requested Service: ${service || 'General Service'}
    
    Analyze if these details seem contradictory or potentially outdated. For example, a 'Platinum' tier salon in 'Jubilee Hills' with a 'Budget' price tier is highly suspicious.
    If you detect a significant discrepancy that the user should be warned about before booking, return a warning flag.
    Format your response as a strict JSON object with keys "flagged" (boolean) and "message" (string explaining the warning if flagged, or null).
    Do not output any markdown code blocks, text wrapper, or explanations. Only raw JSON.`;

    const aiOutput = await queryYourGeminiModel({ prompt });
    let result = { flagged: false, message: null };
    try {
      const cleaned = aiOutput.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('Failed to parse AI verification response:', aiOutput, parseErr);
    }

    if (result.flagged) {
      // Auto-file an internal report if the salon exists
      const salon = await Salon.findById(salonId);
      if (salon) {
        salon.reports.push({
          user: null, // System generated
          reason: 'AI Verification Flag',
          details: result.message,
          status: 'pending'
        });
        await salon.save();
      }
    }

    res.json({ success: true, verification: result });
  } catch (error) {
    console.error('AI booking verification error:', error);
    // Don't block booking if AI fails
    res.json({ success: true, verification: { flagged: false, message: null } });
  }
});

export default router;