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
