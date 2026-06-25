// server/utils/salonEnricher.js
import Salon from '../models/Salon.js';
import { queryYourGeminiModel } from '../services/aiService.js';

export const enrichSalonMedia = async (salonId) => {
  try {
    const salon = await Salon.findById(salonId);
    if (!salon) return null;

    // Construct a crisp address text for context parsing
    const fullAddress = `${salon.address?.street || ''}, ${salon.address?.suburb || ''}, ${salon.address?.city || 'Hyderabad'}`;

    // 1. Layer 1: Query your 4-Layer AI Mesh Engine (Gemini / Groq)
    // Replace 'queryYourGeminiModel' with your actual internal marketplace chat pipeline executor
    let searchTag = "luxury-salon-interior";
    try {
      const aiResponse = await queryYourGeminiModel({
        prompt: `Analyze this business name: "${salon.name}" located at "${fullAddress}". ` +
                `Classify its aesthetic into exactly two highly descriptive search keywords connected by a hyphen. ` +
                `Respond with ONLY the string. No formatting, no punctuation, no extra words.`
      });
      if (aiResponse) {
        searchTag = aiResponse.trim().toLowerCase().replace(/\s+/g, '-');
      }
    } catch (aiErr) {
      console.warn(`AI Tag Synthesis failed for ${salon.name}, dropping to structural string default.`);
    }

    // 2. Layer 2: Hit Unsplash Developer REST Endpoints using your free application key
    const imageResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTag)}&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );
    const imageData = await imageResponse.json();
    
    const fetchedPhoto = imageData?.results?.[0]?.urls?.regular;

    // 3. Fallback Mapping Strategy: Fallback to real OSM banner link if provided, otherwise generic CDN frame
    const finalFallback = salon.images?.banner || 
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80";

    // 4. Cache-on-Write: Write data structures back to the operational database instance
    salon.images.aiMediaUrl = fetchedPhoto || finalFallback;
    salon.images.aiFallbackUrl = finalFallback;
    salon.images.aiTags = searchTag;
    salon.images.lastAiEnrichedAt = new Date();

    await salon.save();
    return salon.images;
  } catch (error) {
    console.error(`Cache write asset enrichment failed for salon ${salonId}:`, error);
    return null;
  }
};