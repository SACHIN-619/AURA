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
      // gemini-2.0-flash-lite: current free-tier model that supports vision (2025)
      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
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
      // llama-4-scout-17b-16e-instruct is Groq's current free vision model (2025)
      const response = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
      
      try {
        const cloudinary = await import('cloudinary');
        cloudinary.v2.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        const uploadRes = await cloudinary.v2.uploader.upload(`data:image/jpeg;base64,${imageBase64}`, {
          folder: 'aura_mirror_history',
          transformation: [{ width: 512, height: 512, crop: "fill" }]
        });
        
        await User.findOneAndUpdate(
          { email: userEmail },
          { $push: { mirrorHistory: { imageUrl: uploadRes.secure_url, result: parsed } } }
        );
      } catch (err) {
        console.warn('[Mirror] Failed to upload to Cloudinary or save history:', err.message);
      }
    }

    // Fetch real salons matching the styles
    const SalonModel = (await import('../models/Salon.js')).default;
    
    // We will attach a list of matching salons to each style
    const stylesWithSalons = await Promise.all(parsed.styles.slice(0, 3).map(async (style) => {
      try {
        const matchingSalons = await SalonModel.find({
          // Simple text match or category match based on the tag or label
          $or: [
            { serviceCategories: { $regex: style.tag || style.label, $options: 'i' } },
            { name: { $regex: style.label, $options: 'i' } }
          ],
          listingVerified: { $ne: false } // Only show verified or OSM (which don't have this explicitly false)
        }).limit(3).lean();
        
        return {
          ...style,
          salons: matchingSalons || []
        };
      } catch (err) {
        return { ...style, salons: [] };
      }
    }));

    return res.json({
      success: true,
      analysis: parsed.analysis || 'Analysis processing parameters standard.',
      detectedContext: parsed.detectedContext || '',
      score: typeof parsed.score === 'number' ? Math.min(96, Math.max(65, parsed.score)) : 78,
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length ? parsed.reasons : ['Tailored to features'],
      styles: stylesWithSalons,
      genderContext,
      aiProvider: activeProvider,
      xpAwarded,
    });
  }

  return res.status(503).json({ success: false, error: 'AURA Vision Processing Pipeline is temporarily offline.' });
};