import Salon from '../models/Salon.js';
import Booking from '../models/Booking.js';
import Rating from '../models/Rating.js';
import Analytics from '../models/Analytics.js';
import { generateStructuredJSON } from '../services/aiService.js';

export const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'You do not own any salon listing yet.' });
    }

    const salonIdStr = salon._id.toString();

    // 1. Get bookings
    const allBookings = await Booking.find({ salonId: salonIdStr });
    
    const totalBookings = allBookings.length;
    const activeBookings = allBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
    
    // 2. Real-time revenue (sum of priceSnapshot for confirmed/completed bookings)
    const confirmedRevenue = allBookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);

    // 3. Analytics: views and bookings conversion rate
    const viewsCount = await Analytics.countDocuments({ salonId: salon._id, event: 'view' });
    // Ensure minimum of viewsCount is totalBookings so conversion isn't mathematically impossible
    const finalViewsCount = Math.max(viewsCount, totalBookings);
    const conversionRate = finalViewsCount > 0 ? ((totalBookings / finalViewsCount) * 100) : 0;

    // 4. Dynamic XP allocated: claims + completed/confirmed bookings weight
    const dynamicXp = 100 + (allBookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length * 10);

    res.json({
      success: true,
      salon,
      metrics: {
        totalBookings,
        activeBookings,
        pendingBookings,
        confirmedRevenue,
        viewsCount: finalViewsCount,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        dynamicXp,
      }
    });
  } catch (error) {
    console.error('Error fetching owner dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOwnerServices = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found for this owner.' });
    }
    res.json({ success: true, services: salon.services || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createOwnerService = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const { name, category, price } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, error: 'name, category, and price are required' });
    }

    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found.' });
    }

    salon.services.push({ name, category, price: Number(price) });
    await salon.save();

    res.json({ success: true, services: salon.services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOwnerService = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const { id } = req.params;
    const { name, category, price } = req.body;

    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found.' });
    }

    const service = salon.services.id(id);
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    if (name !== undefined) service.name = name;
    if (category !== undefined) service.category = category;
    if (price !== undefined) service.price = Number(price);

    await salon.save();
    res.json({ success: true, services: salon.services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteOwnerService = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const { id } = req.params;

    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found.' });
    }

    salon.services = salon.services.filter(s => s._id.toString() !== id);
    await salon.save();

    res.json({ success: true, services: salon.services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOwnerReviewsSentiment = async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const salon = await Salon.findOne({ owner: ownerId });
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found.' });
    }

    const reviews = await Rating.find({ salonId: salon._id, status: 'visible' }).sort({ createdAt: -1 });

    let aiSentiment = {
      overallSentiment: 'Neutral',
      strength: 50,
      summary: 'No active customer reviews to evaluate yet.',
      highlights: ['Claimed Listing'],
      growthAreas: ['Encourage customer check-ins']
    };

    if (reviews.length > 0) {
      const reviewTexts = reviews.map(r => `[Rating: ${r.stars}/5] "${r.comment || ''}"`).join('\n');
      try {
        const systemPrompt = `You are an AI reviews analyzer for a premium luxury marketplace. Analyze the customer reviews provided and return a JSON object with:
{
  "overallSentiment": "Positive" | "Neutral" | "Negative",
  "strength": 1-100,
  "summary": "one-sentence summary",
  "highlights": ["highlight 1", "highlight 2"],
  "growthAreas": ["area 1", "area 2"]
}
Always return valid JSON matching this exact schema.`;
        const { parsed } = await generateStructuredJSON(systemPrompt, reviewTexts);
        if (parsed) {
          aiSentiment = parsed;
        }
      } catch (aiErr) {
        console.warn('Gemini sentiment analysis failed, using fallback:', aiErr.message);
        const avg = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
        aiSentiment = {
          overallSentiment: avg >= 4 ? 'Positive' : avg >= 2.5 ? 'Neutral' : 'Negative',
          strength: Math.round(avg * 20),
          summary: `Evaluated ${reviews.length} reviews with average rating of ${avg.toFixed(1)} stars.`,
          highlights: ['Active Customer Base'],
          growthAreas: ['Review frequency tracking']
        };
      }
    }

    res.json({
      success: true,
      reviews,
      sentiment: aiSentiment
    });
  } catch (error) {
    console.error('Error fetching owner reviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
