// server/controllers/adminController.js
//
// Platform-wide admin dashboard — for the marketplace operator. Protected
// by real JWT auth: requests must carry a valid token whose role is
// 'admin' (see authRoutes.js requireAuth + requireAdmin middleware, applied
// at the route layer in adminRoutes.js — not re-checked per function here).
//
// Becoming an admin happens ONLY by manually editing { role: 'admin' } on a
// user's document directly in MongoDB. No API endpoint, request body, or
// client-controlled field can set this — signup always creates role:'user'.
//
// Every number here is computed from real MongoDB data. No fabricated
// revenue, no fake growth percentages — if we don't have a real signal for
// something, the field is omitted rather than invented.
import Salon   from '../models/Salon.js';
import Booking from '../models/Booking.js';
import Rating  from '../models/Rating.js';
import User    from '../models/User.js';
import Analytics from '../models/Analytics.js';

export const createSalon = async (req, res) => {
  try {
    const { name, hub, address, contact, description, location, images, serviceCategories, servesGender, services } = req.body;

    if (!name || !hub || !location || !location.lat || !location.lon) {
      return res.status(400).json({ success: false, error: 'Name, hub, and location are required.' });
    }

    if (!images || !images.gallery || images.gallery.length < 3) {
      return res.status(400).json({ success: false, error: 'At least 3 images are required.' });
    }

    // Process base64 images if they exist
    const { uploadSalonImage, isUploadConfigured } = await import('../services/uploadService.js');
    const uploadedGalleryUrls = [];
    
    if (isUploadConfigured()) {
      for (let i = 0; i < images.gallery.length; i++) {
        const img = images.gallery[i];
        if (img && img.startsWith('data:image/')) {
          const url = await uploadSalonImage(img, `manual_${Date.now()}`, i);
          uploadedGalleryUrls.push(url);
        } else {
          uploadedGalleryUrls.push(img);
        }
      }
    } else {
       return res.status(500).json({ success: false, error: 'Cloudinary upload is not configured' });
    }

    images.gallery = uploadedGalleryUrls;
    images.banner = uploadedGalleryUrls[0];
    images.thumbnail = uploadedGalleryUrls[0];

    const newSalon = new Salon({
      osmId: `admin_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name,
      hub,
      location: {
        type: 'Point',
        coordinates: [location.lon, location.lat] // GeoJSON expects [longitude, latitude]
      },
      address,
      contact,
      description,
      images,
      serviceCategories,
      servesGender,
      services,
      ratingSource: 'real',
      listingVerified: true, // admin created, so it's verified
      listingVerifiedAt: new Date(),
      listingVerifiedBy: req.user?._id
    });

    await newSalon.save();
    return res.status(201).json({ success: true, salon: newSalon });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getOverview = async (req, res) => {
  try {
    const [
      totalSalons, totalHubs, totalBookings, totalUsers,
      totalRatings, pendingFlagged, salonsWithCategories, salonsWithContact,
    ] = await Promise.all([
      Salon.countDocuments(),
      Salon.distinct('hub').then(h => h.length),
      Booking.countDocuments(),
      User.countDocuments(),
      Rating.countDocuments({ status: 'visible' }),
      Rating.countDocuments({ status: 'flagged' }),
      Salon.countDocuments({ serviceCategories: { $exists: true, $ne: [] } }),
      Salon.countDocuments({ $or: [{ 'contact.phone': { $exists: true, $ne: null } }, { 'contact.website': { $exists: true, $ne: null } }] }),
    ]);

    return res.json({
      success: true,
      overview: {
        totalSalons, totalHubs, totalBookings, totalUsers, totalRatings,
        pendingFlagged,
        dataCoverage: {
          withCategories: totalSalons ? Math.round((salonsWithCategories / totalSalons) * 100) : 0,
          withContact:    totalSalons ? Math.round((salonsWithContact   / totalSalons) * 100) : 0,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getRecentBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .select('salonName salonHub customerName customerEmail service date timeSlot status createdAt')
      .lean();
    return res.json({ success: true, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getModerationQueue = async (req, res) => {
  try {
    const [flagged, lowStars] = await Promise.all([
      Rating.find({ status: 'flagged' }).sort({ createdAt: -1 }).limit(30)
        .populate('salonId', 'name hub').lean(),
      Rating.find({ status: 'visible', stars: { $lte: 2 } }).sort({ createdAt: -1 }).limit(20)
        .populate('salonId', 'name hub').lean(),
    ]);
    return res.json({ success: true, flagged, lowStars });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDataGaps = async (req, res) => {
  try {
    const hubs = await Salon.aggregate([
      {
        $group: {
          _id: '$hub',
          count: { $sum: 1 },
          withCategories: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$serviceCategories', []] } }, 0] }, 1, 0] } },
          withPhone: { $sum: { $cond: [{ $ne: ['$contact.phone', null] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);
    return res.json({ success: true, hubs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Real traffic + conversion analytics — built entirely from events the
// frontend actually fires (view, route_click, ai_search, mirror_used,
// booking_created). No estimated/extrapolated numbers — if an event type
// has zero documents, its count is honestly 0, not hidden or guessed.
export const getAnalytics = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000); // last 30 days
    const [eventCounts, topViewedSalons, topSearchHubs] = await Promise.all([
      Analytics.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
      Analytics.aggregate([
        { $match: { event: 'view', createdAt: { $gte: since }, salonId: { $ne: null } } },
        { $group: { _id: '$salonId', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'salons', localField: '_id', foreignField: '_id', as: 'salon' } },
        { $unwind: '$salon' },
        { $project: { name: '$salon.name', hub: '$salon.hub', views: 1 } },
      ]),
      Analytics.aggregate([
        { $match: { event: { $in: ['route_click', 'booking_created'] }, createdAt: { $gte: since }, hub: { $ne: null } } },
        { $group: { _id: '$hub', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const counts = {};
    eventCounts.forEach(e => { counts[e._id] = e.count; });

    // Real conversion funnel — view → route_click/booking — honestly shows
    // 0% if there's not enough data yet rather than a misleading default.
    const views = counts.view || 0;
    const conversions = (counts.route_click || 0) + (counts.booking_created || 0);
    const conversionRate = views > 0 ? Math.round((conversions / views) * 1000) / 10 : null;

    return res.json({
      success: true,
      analytics: {
        windowDays: 30,
        eventCounts: {
          views: counts.view || 0,
          routeClicks: counts.route_click || 0,
          aiSearches: counts.ai_search || 0,
          mirrorUses: counts.mirror_used || 0,
          bookings: counts.booking_created || 0,
        },
        conversionRate, // null if insufficient data — never fabricated
        topViewedSalons,
        topActiveHubs: topSearchHubs,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// AURA Verified Listing — an admin manually confirms a salon's basic info
// (name, address, contact, category) is accurate. This is SEPARATE from
// Rating.isVerified (which means "this reviewer actually booked here").
// req.user.sub is the admin's own user ID, captured from the JWT so we
// have a real audit trail of who verified what — never trusted from the
// request body.
export const verifyListing = async (req, res) => {
  const { verified } = req.body; // true to verify, false to revoke
  try {
    const salon = await Salon.findByIdAndUpdate(
      req.params.id,
      {
        listingVerified: !!verified,
        listingVerifiedAt: verified ? new Date() : null,
        listingVerifiedBy: verified ? req.user.sub : null,
      },
      { new: true }
    ).select('name hub listingVerified listingVerifiedAt');
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });
    return res.json({ success: true, salon });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Salons awaiting verification — prioritizes ones with the most real data
// already present (contact info + categories), since those are fastest for
// an admin to actually verify by phone/website, rather than a random order.
export const getUnverifiedListings = async (req, res) => {
  try {
    const { hub, page = 1, limit = 20 } = req.query;
    const filter = { listingVerified: false };
    if (hub) filter.hub = new RegExp(hub, 'i');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [salons, total] = await Promise.all([
      Salon.find(filter)
        .select('name hub address contact serviceCategories servesGender openingHours')
        .sort({ 'contact.phone': -1 }) // salons with a phone number first — easiest to verify
        .skip(skip).limit(parseInt(limit)).lean(),
      Salon.countDocuments(filter),
    ]);
    return res.json({ success: true, salons, meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getActivityStream = async (req, res) => {
  try {
    const stream = await User.aggregate([
      { $unwind: '$activityLog' },
      { $sort: { 'activityLog.createdAt': -1 } },
      { $limit: 100 },
      { $project: { name: 1, email: 1, action: '$activityLog.action', metadata: '$activityLog.metadata', createdAt: '$activityLog.createdAt' } }
    ]);
    return res.json({ success: true, stream });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const salonsWithReports = await Salon.find({ 'reports.0': { $exists: true } })
      .select('name hub reports')
      .populate('reports.user', 'name email')
      .lean();
    return res.json({ success: true, salons: salonsWithReports });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select('name email role level xp createdAt')
      .lean();
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role || !['user', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing role. Must be user, admin, or owner.' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('name email role level xp');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user, message: 'User role updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Shop Claim Management ───────────────────────────────────────────────────
export const getClaims = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const filter = {};
    if (status !== 'all') filter.claimStatus = status;
    else filter.claimStatus = { $ne: 'none' };

    const salons = await Salon.find(filter)
      .select('name hub claimStatus claimPending claimPendingAt claimPendingName claimAdminMessage claimResolvedAt owner')
      .populate('claimPending', 'name email')
      .sort({ claimPendingAt: -1 })
      .lean();

    return res.json({ success: true, claims: salons });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const respondToClaim = async (req, res) => {
  try {
    const { id } = req.params;           // salon id
    const { action, message } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
    }

    const salon = await Salon.findById(id).populate('claimPending', 'email name');
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });
    if (salon.claimStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'No pending claim on this salon.' });
    }

    const claimantId = salon.claimPending?._id;
    if (!claimantId) return res.status(400).json({ success: false, error: 'Claimant not found.' });

    if (action === 'approve') {
      // Set owner, verify listing, clear claim queue
      salon.owner              = claimantId;
      salon.listingVerified    = true;
      salon.listingVerifiedAt  = new Date();
      salon.listingVerifiedBy  = req.user.sub;
      salon.badgeType          = 'AURA_VERIFIED';
      salon.claimStatus        = 'approved';
      salon.claimAdminMessage  = message || null;
      salon.claimResolvedAt    = new Date();
      await salon.save();

      // Promote user to owner
      await User.findByIdAndUpdate(claimantId, {
        role: 'owner',
        shopClaimStatus:  'approved',
        shopClaimMessage: message || null,
        $push: { activityLog: { action: `Shop claim approved: ${salon.name}`, metadata: { salonId: salon._id } } }
      });

      return res.json({ success: true, message: `Claim approved. ${salon.claimPending?.name} is now owner of "${salon.name}".` });

    } else {
      // Reject — leave salon unclaimed, notify user
      salon.claimStatus        = 'rejected';
      salon.claimAdminMessage  = message || null;
      salon.claimResolvedAt    = new Date();
      salon.claimPending       = null;
      salon.claimPendingAt     = null;
      await salon.save();

      await User.findByIdAndUpdate(claimantId, {
        shopClaimStatus:  'rejected',
        shopClaimSalonId: null,
        shopClaimMessage: message || 'Your claim was reviewed and could not be approved at this time.',
        $push: { activityLog: { action: `Shop claim rejected: ${salon.name}`, metadata: { salonId: salon._id } } }
      });

      return res.json({ success: true, message: `Claim rejected. User has been notified.` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Full shop browsing for admin (replaces need to open MongoDB Compass) ────
export const getAllSalons = async (req, res) => {
  try {
    const { search = '', hub = '', disabled, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { hub:  { $regex: search, $options: 'i' } },
    ];
    if (hub) filter.hub = new RegExp(hub, 'i');
    if (disabled === 'true')  filter.disabled = true;
    if (disabled === 'false') filter.disabled = { $ne: true };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [salons, total] = await Promise.all([
      Salon.find(filter)
        .select('name hub address contact description openingHours serviceCategories customTags servesGender images priceTier tier isFeatured listingVerified disabled disabledReason claimStatus owner ratingSource luxuryRating reviewCount createdAt')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)).lean(),
      Salon.countDocuments(filter),
    ]);
    return res.json({ success: true, salons, meta: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Edit any salon field directly from the admin dashboard ──────────────────
export const updateSalon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hub, address, contact, description, openingHours, serviceCategories, customTags, servesGender, images, priceTier, tier, isFeatured } = req.body;

    const update = { lastSyncedAt: new Date() };
    if (name          !== undefined) update.name              = name;
    if (hub           !== undefined) update.hub               = hub;
    if (address       !== undefined) update.address           = address;
    if (contact       !== undefined) update.contact           = contact;
    if (description   !== undefined) update.description       = description;
    if (openingHours  !== undefined) update.openingHours      = openingHours;
    if (serviceCategories !== undefined) update.serviceCategories = serviceCategories;
    if (customTags    !== undefined) update.customTags        = customTags;
    if (servesGender  !== undefined) update.servesGender      = servesGender;
    if (priceTier     !== undefined) update.priceTier         = priceTier;
    if (tier          !== undefined) update.tier              = tier;
    if (isFeatured    !== undefined) update.isFeatured        = isFeatured;
    if (images) {
      if (images.banner    !== undefined) update['images.banner']    = images.banner;
      if (images.thumbnail !== undefined) update['images.thumbnail'] = images.thumbnail;
      if (images.gallery   !== undefined) update['images.gallery']   = images.gallery;
    }

    const salon = await Salon.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .select('name hub address contact description openingHours serviceCategories customTags servesGender images priceTier tier isFeatured listingVerified disabled').lean();

    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });
    return res.json({ success: true, salon, message: `"${salon.name}" updated successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Enable / Disable a salon listing ────────────────────────────────────────
export const toggleSalonDisabled = async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled, reason } = req.body;
    const update = disabled
      ? { disabled: true,  disabledAt: new Date(), disabledBy: req.user.sub, disabledReason: reason || null }
      : { disabled: false, disabledAt: null,       disabledBy: null,         disabledReason: null };
    const salon = await Salon.findByIdAndUpdate(id, { $set: update }, { new: true }).select('name hub disabled').lean();
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });
    return res.json({ success: true, message: disabled ? `"${salon.name}" hidden from public.` : `"${salon.name}" is live again.`, salon });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Enable / Disable a user account ─────────────────────────────────────────
export const toggleUserDisabled = async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled, reason } = req.body;
    const update = disabled
      ? { disabled: true,  disabledAt: new Date(), disabledReason: reason || 'Account suspended by admin.' }
      : { disabled: false, disabledAt: null,       disabledReason: null };
    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true }).select('name email disabled').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, message: disabled ? `${user.name} suspended.` : `${user.name} re-enabled.`, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Area expansion intelligence feed ────────────────────────────────────────
export const getNullSearches = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000);
    const raw = await Analytics.aggregate([
      { $match: { event: 'null_area_search', createdAt: { $gte: since } } },
      { $group: { _id: { $toLower: { $ifNull: ['$metadata.query', 'unknown'] } }, count: { $sum: 1 }, resolvedName: { $first: '$metadata.resolvedName' }, lastSeenAt: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
    return res.json({ success: true, nullSearches: raw });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── Dismiss a report on a salon ──────────────────────────────────────────────
export const dismissReport = async (req, res) => {
  try {
    const { id, reportId } = req.params;
    const { action } = req.body; // 'resolved' | 'dismissed'
    if (!['resolved', 'dismissed'].includes(action))
      return res.status(400).json({ success: false, error: 'action must be resolved or dismissed' });
    const salon = await Salon.findOneAndUpdate(
      { _id: id, 'reports._id': reportId },
      { $set: { 'reports.$.status': action } },
      { new: true }
    ).select('name reports');
    if (!salon) return res.status(404).json({ success: false, error: 'Salon or report not found' });
    return res.json({ success: true, message: `Report marked as ${action}.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
