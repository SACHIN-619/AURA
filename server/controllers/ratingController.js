// server/controllers/ratingController.js
import Rating  from '../models/Rating.js';
import Booking from '../models/Booking.js';
import Salon   from '../models/Salon.js';
import User    from '../models/User.js';
import { awardXp } from '../utils/xp.js';

// Submit or update a rating. Verification is computed server-side by
// checking for a real prior Booking from this same email for this same
// salon — the client cannot claim verification itself.
export const submitRating = async (req, res) => {
  const { salonId, customerEmail, customerName, stars, comment } = req.body;

  if (!salonId || !customerEmail || !customerName || !stars) {
    return res.status(400).json({ success: false, error: 'salonId, customerEmail, customerName, stars are required' });
  }
  if (stars < 1 || stars > 5) {
    return res.status(400).json({ success: false, error: 'stars must be between 1 and 5' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid email' });
  }

  try {
    const salon = await Salon.findById(salonId).select('_id').lean();
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });

    // Check BEFORE the upsert so we know if this is a first-time submission
    // (earns XP) vs an edit to an existing rating (should not earn XP again
    // — otherwise someone could farm XP by repeatedly editing one rating).
    const existingRating = await Rating.findOne({ salonId, customerEmail: customerEmail.toLowerCase().trim() }).lean();
    const isFirstSubmission = !existingRating;

    // Real verification check — was there ever a genuine booking record
    // from this email for this salon? If yes, link it and mark verified.
    const priorBooking = await Booking.findOne({
      salonId,
      customerEmail: customerEmail.toLowerCase().trim(),
    }).sort({ createdAt: -1 }).lean();

    const ratingDoc = await Rating.findOneAndUpdate(
      { salonId, customerEmail: customerEmail.toLowerCase().trim() },
      {
        $set: {
          customerName: customerName.trim(),
          stars,
          comment: (comment || '').trim().slice(0, 500),
          isVerified: !!priorBooking,
          bookingId: priorBooking?._id || null,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Award XP only on a genuine first-time submission for this salon.
    let xpAwarded = 0;
    if (isFirstSubmission) {
      const base = await awardXp(User, customerEmail, 'rating_submitted');
      if (base) xpAwarded += base.xpAwarded;
      if (ratingDoc.isVerified) {
        const bonus = await awardXp(User, customerEmail, 'rating_verified_bonus');
        if (bonus) xpAwarded += bonus.xpAwarded;
      }
    }

    return res.json({
      success: true,
      rating: {
        _id: ratingDoc._id,
        stars: ratingDoc.stars,
        comment: ratingDoc.comment,
        isVerified: ratingDoc.isVerified,
        createdAt: ratingDoc.createdAt,
      },
      xpAwarded, // 0 if this was an edit to an existing rating, or no account exists for this email
      message: ratingDoc.isVerified
        ? 'Thank you — your AuraVerified rating has been recorded.'
        : 'Thank you for rating. Book through AURA next time to get an AuraVerified badge on your review.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'You have already rated this salon — try updating it instead.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Real aggregate stats for a salon — this is what the UI displays instead
// of any fabricated number. Returns null average if zero ratings exist yet,
// which the frontend must render as "Not yet rated" rather than 0★ or 4.5★.
export const getSalonRatings = async (req, res) => {
  const { salonId } = req.params;
  try {
    const [stats] = await Rating.aggregate([
      { $match: { salonId: new (await import('mongoose')).default.Types.ObjectId(salonId), status: 'visible' } },
      {
        $group: {
          _id: null,
          avgStars: { $avg: '$stars' },
          totalCount: { $sum: 1 },
          verifiedCount: { $sum: { $cond: ['$isVerified', 1, 0] } },
        },
      },
    ]);

    const recent = await Rating.find({ salonId, status: 'visible' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('customerName stars comment isVerified createdAt')
      .lean();

    return res.json({
      success: true,
      stats: stats ? {
        avgStars: Math.round(stats.avgStars * 10) / 10,
        totalCount: stats.totalCount,
        verifiedCount: stats.verifiedCount,
      } : { avgStars: null, totalCount: 0, verifiedCount: 0 },
      reviews: recent,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Check if a given email is eligible to leave a verified rating for a salon
// (used by the frontend to decide whether to show the "rate it" prompt
// after a booking, and whether to show the verified badge preview).
export const checkRatingEligibility = async (req, res) => {
  const { salonId, email } = req.query;
  if (!salonId || !email) return res.status(400).json({ success: false, error: 'salonId and email required' });
  try {
    const [hasBooking, existingRating] = await Promise.all([
      Booking.exists({ salonId, customerEmail: email.toLowerCase().trim() }),
      Rating.findOne({ salonId, customerEmail: email.toLowerCase().trim() }).select('stars comment').lean(),
    ]);
    return res.json({
      success: true,
      eligibleForVerified: !!hasBooking,
      alreadyRated: !!existingRating,
      existingRating: existingRating || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Admin moderation — hide/flag a rating. Auth is enforced at the route
// layer (requireAuth + requireAdmin in ratingRoutes.js), so by the time
// this function runs, req.user.role is already confirmed to be 'admin'.
export const moderateRating = async (req, res) => {
  const { status } = req.body;
  if (!['visible', 'hidden', 'flagged'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  try {
    const rating = await Rating.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rating) return res.status(404).json({ success: false, error: 'Rating not found' });
    return res.json({ success: true, rating });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
