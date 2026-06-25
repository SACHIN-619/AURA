// server/controllers/salonController.js
import Salon from '../models/Salon.js';

export const getSalons = async (req, res) => {
  try {
    const { hub, category, gender, page = 1, limit = 60, sort = 'name' } = req.query;
    const filter = {};
    if (hub) filter.hub = new RegExp(hub, 'i');
    if (category) filter.serviceCategories = category;
    if (gender && gender !== 'any') filter.servesGender = gender;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [salons, total] = await Promise.all([
      Salon.find(filter).select('-__v').sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Salon.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: salons,
      meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const getSalonById = async (req, res) => {
  try {
    const s = await Salon.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ success: false, error: 'Salon not found' });
    return res.json({ success: true, data: s });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const getNearbySalons = async (req, res) => {
  try {
    const { lon, lat, radius = 5000 } = req.query;
    if (!lon || !lat) return res.status(400).json({ success: false, error: 'lon and lat required' });
    const salons = await Salon.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    }).limit(20).lean();
    return res.json({ success: true, data: salons, count: salons.length });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const getFeatured = async (req, res) => {
  try {
    const salons = await Salon.find({ isFeatured: true }).limit(6).lean();
    return res.json({ success: true, data: salons });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * GET /api/salons/hubs
 *
 * Returns hub list from:
 *  1. MongoDB aggregation (live data, preferred)
 *  2. ACTIVE_MARKETPLACE_HUBS env var (config fallback when DB has no data)
 *
 * Shape: { success, data: [{ hub, count, lat, lon }] }
 */
export const getHubs = async (req, res) => {
  try {
    // ── 1. Try live aggregation from DB ──────────────────────────────────────
    const dbHubs = await Salon.aggregate([
      {
        $group: {
          _id: '$hub',
          count: { $sum: 1 },
          avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
          avgLon: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
        }
      },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { count: -1 } },
      {
        $project: {
          hub: '$_id',
          count: 1,
          lat: { $ifNull: [{ $round: ['$avgLat', 5] }, 17.385] },
          lon: { $ifNull: [{ $round: ['$avgLon', 5] }, 78.4867] },
          _id: 0
        }
      },
    ]);

    if (dbHubs.length > 0) {
      return res.json({ success: true, data: dbHubs });
    }

    // ── 2. Fall back to ACTIVE_MARKETPLACE_HUBS env var ──────────────────────
    const envHubs = (process.env.ACTIVE_MARKETPLACE_HUBS || '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    if (envHubs.length > 0) {
      // Approximate centroids for Hyderabad hubs (used only when DB is empty)
      const CENTROID_LOOKUP = {
        'Jubilee Hills':  { lat: 17.4322, lon: 78.4136 },
        'Banjara Hills':  { lat: 17.4153, lon: 78.4480 },
        'Hitech City':    { lat: 17.4474, lon: 78.3762 },
        'Gachibowli':     { lat: 17.4401, lon: 78.3489 },
        'Madhapur':       { lat: 17.4475, lon: 78.3908 },
        'Kondapur':       { lat: 17.4600, lon: 78.3599 },
        'Kukatpally':     { lat: 17.4849, lon: 78.3995 },
        'Ameerpet':       { lat: 17.4375, lon: 78.4483 },
      };
      const data = envHubs.map(hub => ({
        hub,
        count: 0,
        lat: CENTROID_LOOKUP[hub]?.lat ?? 17.3850,
        lon: CENTROID_LOOKUP[hub]?.lon ?? 78.4867,
      }));
      return res.json({ success: true, data });
    }

    return res.json({ success: true, data: [] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const reportSalon = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, reason, details } = req.body;
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Must be logged in to report.' });
    }

    const salon = await Salon.findById(id);
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found.' });

    salon.reports.push({
      user,
      reason: reason || 'Other',
      details: details || '',
    });
    
    await salon.save();

    // Log the action to User Activity Log
    await import('../models/User.js').then(m => {
      m.default.findByIdAndUpdate(user, {
        $push: { activityLog: { action: `Reported Salon: ${salon.name}`, metadata: { salonId: id, reason } } }
      }).catch(e => console.error(e));
    });

    return res.json({ success: true, message: 'Report submitted successfully.' });
  } catch (err) {
    console.error('Error reporting salon:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};