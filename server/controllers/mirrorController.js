// server/controllers/mirrorController.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import User from '../models/User.js';
import { awardXp } from '../utils/xp.js';

function buildPrompt(genderContext) {
  const genderLine = genderContext
    ? `The person has told us they identify as: ${genderContext}. Tailor every recommendation to suit this.`
    : `The person did not specify a gender — infer respectfully from the photo, or keep recommendations gender-neutral if unclear.`;

  return `You are AURA, a luxury Hyderabad grooming concierge analyzing a selfie to recommend real, bookable salon services.
${genderLine}

Look at the photo's hair type, face shape, current style, and skin/hair condition. Recommend exactly 3 SPECIFIC, REAL grooming/beauty services available at salons (haircuts, beard work, hair therapy, bridal/makeup, skincare, etc — whatever genuinely suits this person).

Respond ONLY with valid JSON, no markdown, no commentary:
{
  "analysis": "one warm, SPECIFIC sentence referencing what you actually see (hair length, texture, face shape) — max 28 words",
  "detectedContext": "brief note on what visual cues informed your recommendation, max 15 words",
  "score": 78,
  "reasons": ["specific reason 1", "specific reason 2", "specific reason 3"],
  "styles": [
    {"label": "Specific Service Name", "tag": "grooming|bridal|hair-therapy|skincare", "searchKeyword": "2-4 word image search term, lowercase, plus-separated, e.g. low+fade+haircut"},
    {"label": "...", "tag": "...", "searchKeyword": "2-4 word image search term"},
    {"label": "...", "tag": "...", "searchKeyword": "2-4 word image search term"}
  ]
}
score: an honest 65-96 based on how photo-ready their current grooming is (lower score = more room for a dramatic, exciting transformation — frame this positively).
Every style must be something an actual Hyderabad salon would offer. No vague labels like "look" or "style" — be specific.`;
}

function cleanJsonResponse(rawText) {
  let s = rawText.trim();
  if (s.startsWith('```')) {
    s = s.substring(3);
    if (s.toLowerCase().startsWith('json')) s = s.substring(4);
  }
  if (s.endsWith('```')) {
    s = s.substring(0, s.length - 3);
  }
  return JSON.parse(s.trim());
}

export const analyzeImage = async (req, res) => {
  const { imageBase64, gender } = req.body;
  
  // Strict reference lookup from Verified User Context, NOT Client Input
  const userEmail = req.user?.email; 

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ success: false, error: 'imageBase64 required' });
  }

  const genderContext = typeof gender === 'string' && gender.trim() ? gender.trim() : null;
  const prompt = buildPrompt(genderContext);
  
  let rawBase64Data = imageBase64;
  if (imageBase64.startsWith('data:image')) {
    const commaIndex = imageBase64.indexOf(',');
    if (commaIndex !== -1) {
      rawBase64Data = imageBase64.substring(commaIndex + 1);
    }
  }

  let parsed = null;
  let activeProvider = null;

  // Layer 1: Gemini Engine
  if (process.env.GEMINI_API_KEY && !parsed) {
    try {
      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-2.0-flash' });
      const r = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'image/jpeg', data: rawBase64Data } },
      ]);
      parsed = cleanJsonResponse(r.response.text());
      activeProvider = 'Gemini Vision';
    } catch (e) {
      console.warn('[Mirror] Primary pipeline bypass:', e.message);
    }
  }

  // Layer 2: Groq Engine
  if (process.env.GROQ_API_KEY && !parsed) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + rawBase64Data } }
          ]
        }],
        response_format: { type: 'json_object' }
      });
      parsed = cleanJsonResponse(response.choices[0]?.message?.content);
      activeProvider = 'Groq Llama Vision';
    } catch (e) {
      console.warn('[Mirror] Secondary pipeline bypass:', e.message);
    }
  }

  // Layer 3: HuggingFace Text Fallback
  if (process.env.HUGGINGFACE_API_KEY && !parsed) {
    try {
      const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
      const response = await hf.chatCompletion({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Process structural format verification' }
        ]
      });
      parsed = cleanJsonResponse(response?.choices[0]?.message?.content);
      activeProvider = 'HuggingFace Matrix';
    } catch (e) {
      console.warn('[Mirror] Tertiary pipeline failure:', e.message);
    }
  }

  if (parsed && Array.isArray(parsed.styles) && parsed.styles.length) {
    let xpAwarded = 0;
    if (userEmail) {
      const xp = await awardXp(User, userEmail, 'mirror_used');
      if (xp) xpAwarded = xp.xpAwarded;
    }

    return res.json({
      success: true,
      analysis: parsed.analysis || 'Analysis processing parameters standard.',
      detectedContext: parsed.detectedContext || '',
      score: typeof parsed.score === 'number' ? Math.min(96, Math.max(65, parsed.score)) : 78,
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length ? parsed.reasons : ['Tailored to features'],
      styles: parsed.styles.slice(0, 3),
      genderContext,
      aiProvider: activeProvider,
      xpAwarded,
    });
  }

  return res.status(503).json({ success: false, error: 'AURA Vision Processing Pipeline is temporarily offline.' });
};