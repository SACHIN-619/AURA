// server/routes/searchRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete } from '../controllers/searchController.js';

import { queryYourGeminiModel } from '../services/aiService.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60000, max: 120, message: { success: false, error: 'Too many requests' } });

router.get('/autocomplete', lim, autocomplete);

router.get('/geocode-ai', lim, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: false });
    const prompt = `You are a geographical assistant for Hyderabad, India. The user searched for "${q}". If this is a valid place/area in Hyderabad or nearby (like Hussain Sagar, Uppal, Secunderabad etc), return the approximate latitude, longitude, and correctly spelled area name. If it's not in or near Hyderabad, set isValid to false.
Return ONLY valid JSON like: {"isValid":true, "hub":"Hussain Sagar", "lat":17.422, "lon":78.475}. No markdown.`;
    const aiOutput = await queryYourGeminiModel({ prompt });
    const parsed = JSON.parse(aiOutput.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim());
    res.json({ success: true, result: parsed });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

export default router;