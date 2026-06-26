// server/controllers/salonController.js
import Salon from '../models/Salon.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

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

    const envHubs = (process.env.ACTIVE_MARKETPLACE_HUBS || '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

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

    let finalHubs = [];

    if (dbHubs.length > 0) {
      finalHubs = [...dbHubs];
    }

    if (envHubs.length > 0) {
      envHubs.forEach(hubName => {
        if (!finalHubs.some(h => h.hub.toLowerCase() === hubName.toLowerCase())) {
          finalHubs.push({
            hub: hubName,
            count: 0,
            lat: CENTROID_LOOKUP[hubName]?.lat ?? 17.3850,
            lon: CENTROID_LOOKUP[hubName]?.lon ?? 78.4867,
          });
        }
      });
    }

    return res.json({ success: true, data: finalHubs });
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

export const claimSalon = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { salonId, salonName } = req.body;

    let salon;
    if (salonId) {
      if (!mongoose.Types.ObjectId.isValid(salonId)) {
        return res.status(400).json({ success: false, error: "This salon cannot be claimed online because it uses a temporary sync ID." });
      }
      salon = await Salon.findById(salonId);
    } else if (salonName?.trim()) {
      salon = await Salon.findOne({ name: new RegExp(salonName.trim(), 'i') });
    }

    if (!salon) {
      return res.status(404).json({
        success: false,
        error: salonName
          ? `No salon found matching "${salonName}". Try a different spelling.`
          : 'Salon not found.'
      });
    }

    // Already has an owner
    if (salon.owner) {
      return res.status(400).json({ success: false, error: 'This salon already has a verified owner.' });
    }

    // Already has a pending claim (by anyone)
    if (salon.claimStatus === 'pending') {
      const isSelf = salon.claimPending?.toString() === userId;
      if (isSelf) return res.status(400).json({ success: false, error: 'You already have a pending claim for this salon.' });
      return res.status(400).json({ success: false, error: 'This salon already has a pending claim under review.' });
    }

    // User already has a pending claim on another salon
    const user = await User.findById(userId);
    if (user.shopClaimStatus === 'pending') {
      return res.status(400).json({ success: false, error: 'You already have a pending claim. Cancel it first to claim a different salon.' });
    }

    // Set claim to pending — admin must approve
    salon.claimPending    = userId;
    salon.claimPendingAt  = new Date();
    salon.claimPendingName = salonName?.trim() || salon.name;
    salon.claimStatus     = 'pending';
    await salon.save();

    // Update user's claim status
    await User.findByIdAndUpdate(userId, {
      shopClaimStatus:  'pending',
      shopClaimSalonId: salon._id,
      shopClaimMessage: null,
      $push: { activityLog: { action: `Submitted claim for: ${salon.name}`, metadata: { salonId: salon._id } } }
    });

    return res.json({
      success: true,
      message: `Claim submitted for "${salon.name}". An admin will review it within 24-48 hours. You\'ll see the status in your dashboard.`,
      salon: { _id: salon._id, name: salon.name, hub: salon.hub }
    });
  } catch (err) {
    console.error('Error claiming salon:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const cancelClaim = async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user.shopClaimSalonId || user.shopClaimStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'No pending claim to cancel.' });
    }

    // Reset salon
    await Salon.findByIdAndUpdate(user.shopClaimSalonId, {
      claimPending: null, claimPendingAt: null, claimPendingName: null,
      claimStatus: 'none', claimAdminMessage: null
    });

    // Reset user
    await User.findByIdAndUpdate(userId, {
      shopClaimStatus: 'none', shopClaimSalonId: null, shopClaimMessage: null,
      $push: { activityLog: { action: 'Cancelled shop claim', metadata: {} } }
    });

    return res.json({ success: true, message: 'Claim withdrawn successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};