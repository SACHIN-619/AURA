// server/controllers/ratingController.js
import Rating  from '../models/Rating.js';
import Booking from '../models/Booking.js';
import Salon   from '../models/Salon.js';
import User    from '../models/User.js';
import { awardXp } from '../utils/xp.js';

export const submitRating = async (req, res) => {
  const { salonId, stars, comment } = req.body;
  
  // Extract credentials strictly from validated auth context, preventing payload impersonation
  const customerEmail = req.user?.email?.toLowerCase().trim();
  
  if (!salonId || !stars) {
    return res.status(400).json({ success: false, error: 'salonId and stars rating parameter sets required' });
  }
  if (stars < 1 || stars > 5) {
    return res.status(400).json({ success: false, error: 'Stars assignment out of system boundary bounds (1-5 only)' });
  }

  try {
    const salon = await Salon.findById(salonId).select('_id').lean();
    if (!salon) return res.status(404).json({ success: false, error: 'Salon target record missing.' });

    // Enforce matching profile user extraction
    const userProfile = await User.findOne({ email: customerEmail }).select('name').lean();
    const customerName = userProfile?.name || 'Anonymous Client';

    // Verify booking completion status across history indexes to authorize submission validation
    const priorBooking = await Booking.findOne({
      salonId,
      customerEmail,
    }).sort({ createdAt: -1 }).lean();

    // STRICT REJECTION OPTION: If you wish to entirely block non-verified reviews, uncomment the lines below:
    // if (!priorBooking) {
    //   return res.status(403).json({ success: false, error: 'Review rejected. Only verified clients with past booking entries are permitted to evaluate this business.' });
    // }

    const existingRating = await Rating.findOne({ salonId, customerEmail }).lean();
    const isFirstSubmission = !existingRating;

    const ratingDoc = await Rating.findOneAndUpdate(
      { salonId, customerEmail },
      {
        $set: {
          customerName,
          stars,
          comment: (comment || '').trim().slice(0, 500),
          isVerified: !!priorBooking,
          bookingId: priorBooking?._id || null,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

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
      xpAwarded,
      message: ratingDoc.isVerified
        ? 'Thank you — your AuraVerified badge rating has been successfully logged.'
        : 'Thank you for rating. Book through AURA next time to get an AuraVerified badge on your review.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Duplicate entry detected. Update your historic rating profile entry instead.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

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

export const checkRatingEligibility = async (req, res) => {
  const { salonId } = req.query;
  const email = req.user?.email;
  
  if (!salonId || !email) return res.status(400).json({ success: false, error: 'Target query profiles parameters unfulfilled' });
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

export const moderateRating = async (req, res) => {
  const { status } = req.body;
  if (!['visible', 'hidden', 'flagged'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status configurations.' });
  }
  try {
    const rating = await Rating.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!rating) return res.status(404).json({ success: false, error: 'Rating target context missing.' });
    return res.json({ success: true, rating });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};