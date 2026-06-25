// server/routes/ratingRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitRating, getSalonRatings, checkRatingEligibility, moderateRating } from '../controllers/ratingController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60 * 1000, max: 20, message: { success: false, error: 'Too many rating requests' } });

// Secure critical entry vectors with session auth to eradicate structural fake ratings
router.post('/',               lim, requireAuth, submitRating);
router.get('/eligibility',     requireAuth, checkRatingEligibility);

// Open viewing endpoints remains publicly accessible
router.get('/salon/:salonId',  getSalonRatings);

// Strict validation overrides preserved exclusively under master operational roles
router.patch('/:id/moderate',  lim, requireAuth, requireAdmin, moderateRating);

export default router;