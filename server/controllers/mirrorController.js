import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User.js';
import { awardXp } from '../utils/xp.js';

// No hardcoded style list. The AI generates style names and image search
// keywords itself based on the actual photo + the gender context the user
// provided — this means recommendations are genuinely tailored per-person,
// not picked from a fixed array of 6 pre-written options.
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
    {"label": "...", "tag": "...", "searchKeyword": "..."},
    {"label": "...", "tag": "...", "searchKeyword": "..."}
  ]
}
score: an honest 65-96 based on how photo-ready their current grooming is (lower score = more room for a dramatic, exciting transformation — frame this positively).
Every style must be something an actual Hyderabad salon would offer. No vague labels like "look" or "style" — be specific (e.g. "Textured Crop Fade", "Keratin Smoothing Treatment", "Bridal Airbrush Makeup", "Charcoal Beard Sculpt").`;
}

export const analyzeImage = async (req,res) => {
  // email is optional — Mirror works fully anonymously. XP is only awarded
  // when we genuinely know which account to credit; no email means no XP,
  // never a guess.
  const {imageBase64, gender, email} = req.body;
  if(!imageBase64||typeof imageBase64!=='string') return res.status(400).json({success:false,error:'imageBase64 required'});

  // gender is optional free-text context the user chose on the intro screen
  // (e.g. "Woman", "Man", "Non-binary", "Prefer not to say") — never assumed.
  const genderContext = typeof gender === 'string' && gender.trim() ? gender.trim() : null;

  if(process.env.GEMINI_API_KEY) {
    try {
      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({model:'gemini-2.0-flash'});
      const r = await model.generateContent([
        buildPrompt(genderContext),
        {inlineData:{mimeType:'image/jpeg',data:imageBase64}},
      ]);
      const text = r.response.text().replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed.styles) || !parsed.styles.length) {
        throw new Error('AI returned no styles');
      }

      let xpAwarded = 0;
      if (email) {
        const xp = await awardXp(User, email, 'mirror_used');
        if (xp) xpAwarded = xp.xpAwarded;
      }
      return res.json({
        success: true,
        analysis: parsed.analysis || 'Your look has great potential for a tailored grooming session.',
        detectedContext: parsed.detectedContext || '',
        score: typeof parsed.score === 'number' ? Math.min(96, Math.max(65, parsed.score)) : 78,
        reasons: Array.isArray(parsed.reasons) && parsed.reasons.length ? parsed.reasons : ['Tailored to your features', 'Photo-ready transformation', 'Available in Hyderabad'],
        styles: parsed.styles.slice(0, 3),
        genderContext,
        xpAwarded,
      });
    } catch(e) {
      console.warn('[Mirror] AI analysis failed:', e.message);
      // Fall through to honest failure response below — we do NOT serve a
      // fixed canned style list pretending it came from real analysis.
    }
  }

  // Genuinely honest failure — tell the user AI couldn't analyze their photo,
  // instead of returning a fake "result" that looks like real analysis but
  // is actually a hardcoded array unrelated to their actual photo or gender.
  return res.status(503).json({
    success: false,
    error: process.env.GEMINI_API_KEY
      ? 'AI analysis failed — the image may be unclear, or the AI service is temporarily unavailable. Please try again.'
      : 'AURA Mirror requires an AI vision provider (GEMINI_API_KEY) which is not configured on this server.',
  });
};
