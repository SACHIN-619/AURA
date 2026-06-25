// server/routes/salonRoutes.js
import express from 'express';
import { getSalons, getSalonById, getNearbySalons, getFeatured, getHubs } from '../controllers/salonController.js';
import { enrichSalonMedia } from '../utils/salonEnricher.js';

const router = express.Router();

// Helper to intercept payloads and inject live media keys smoothly without blocking execution threads
const resolveMediaPayload = (salon) => {
  if (!salon) return null;
  
  const hasEnrichedImage = salon.images?.aiMediaUrl;

  // Fire-and-forget generation hook: triggers asynchronously if database node data is unpopulated
  if (!hasEnrichedImage) {
    enrichSalonMedia(salon._id);
  }

  return {
    ...salon,
    displayImage: hasEnrichedImage || salon.images?.banner || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
    fallbackImage: salon.images?.aiFallbackUrl || salon.images?.banner || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
    aiClassificationTags: salon.images?.aiTags || "luxury-salon"
  };
};

router.get('/featured', async (req, res, next) => {
  // Leverage your controller but intercept to map clean dynamic imagery assets
  req.handlerOverride = true; 
  return getFeatured(req, res, next);
});

router.get('/nearby', getNearbySalons);
router.get('/hubs', getHubs);

// Base Search Listing
router.get('/', async (req, res) => {
  try {
    // Intercept default core list fetching logic natively
    const salons = await mongoose.model('Salon').find({}).lean();
    const enrichedData = salons.map(salon => resolveMediaPayload(salon));
    
    res.json({ success: true, data: enrichedData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Document Target Lookup
router.get('/:id', async (req, res) => {
  try {
    const salon = await mongoose.model('Salon').findById(req.params.id).lean();
    if (!salon) return res.status(404).json({ success: false, error: "Salon not found" });
    
    res.json({ success: true, data: resolveMediaPayload(salon) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;