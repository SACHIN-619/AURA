import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitRating, getSalonRatings, checkRatingEligibility, moderateRating } from '../controllers/ratingController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60*1000, max: 20, message: { success: false, error: 'Too many rating requests' } });

router.post('/',                    lim, submitRating);
router.get('/salon/:salonId',       getSalonRatings);
router.get('/eligibility',          checkRatingEligibility);
// Only an admin-role JWT can moderate ratings — submit/read above stay
// public since rating and browsing a salon's reviews needs no account.
router.patch('/:id/moderate',       lim, requireAuth, requireAdmin, moderateRating);

export default router;
