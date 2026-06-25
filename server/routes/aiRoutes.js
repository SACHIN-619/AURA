import express from 'express';
import rateLimit from 'express-rate-limit';
import { chatQuery } from '../controllers/aiController.js';
import { queryYourGeminiModel } from '../services/aiService.js';
import Salon from '../models/Salon.js';

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
    
    if (targetLang === 'en') {
      return res.json({ success: true, translatedText: text });
    }

    const prompt = `Translate the following text into the language represented by the code "${targetLang}" (e.g. "te" is Telugu, "hi" is Hindi, "ur" is Urdu, etc.). ` +
      `Translate it naturally as a localized marketplace UI string. ` +
      `Respond with ONLY the exact translated text. Do not add markdown code blocks, quotes, formatting, or any explanations.\n\n` +
      `Text to translate: "${text}"`;

    const translatedText = await queryYourGeminiModel({ prompt });
    res.json({ success: true, translatedText: translatedText.trim() });
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

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    if (salon.aiResearchData && salon.aiResearchData.summary) {
      return res.json({ success: true, enriched: salon.aiResearchData });
    }

    const prompt = `Given the luxury salon "${name}" located in the area "${hub}" in Hyderabad, ` +
      `generate a highly premium and alluring one-sentence promotional summary/highlight for a marketplace user, ` +
      `and estimate a reasonable starting entry price in Rupees (e.g., "₹600+", "₹1200+", "₹2000+" depending on how upscale the salon name sounds). ` +
      `Format your response as a strict JSON object with keys "summary" and "estimatedBasePrice". ` +
      `Do not output any markdown code blocks, text wrapper, or explanations. Only raw JSON. ` +
      `Example format: {"summary":"A premier grooming lounge in Jubilee Hills offering state-of-the-art hair aesthetics.","estimatedBasePrice":"₹1200+"}`;

    const aiOutput = await queryYourGeminiModel({ prompt });
    let enriched = { summary: '', estimatedBasePrice: '₹500+' };
    try {
      const cleaned = aiOutput.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.summary) enriched.summary = parsed.summary;
      if (parsed.estimatedBasePrice) enriched.estimatedBasePrice = parsed.estimatedBasePrice;
    } catch (parseErr) {
      console.warn('Failed to parse AI salon enrichment response:', aiOutput, parseErr);
      enriched.summary = `${name} is a premier styling lounge in ${hub} offering bespoke luxury grooming.`;
    }

    salon.aiResearchData = enriched;
    await salon.save();

    res.json({ success: true, enriched });
  } catch (error) {
    console.error('Salon enrichment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;