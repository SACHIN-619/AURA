import express from 'express';
import rateLimit from 'express-rate-limit';
import { getOverview, getRecentBookings, getModerationQueue, getDataGaps, getAnalytics, verifyListing, getUnverifiedListings, getActivityStream, getReports, getUsers, updateUserRole, getClaims, respondToClaim, createSalon } from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60*1000, max: 60, message: { success: false, error: 'Too many admin requests' } });

// Every route here requires a valid JWT (requireAuth) AND that JWT's role
// claim must be 'admin' (requireAdmin). Role can only become 'admin' by a
// direct MongoDB edit — never through any request this API accepts.
router.use(requireAuth, requireAdmin);

router.post('/salons',          lim, createSalon);
router.get('/overview',         lim, getOverview);
router.get('/bookings',         lim, getRecentBookings);
router.get('/moderation-queue', lim, getModerationQueue);
router.get('/data-gaps',        lim, getDataGaps);
router.get('/analytics',        lim, getAnalytics);
router.get('/listings/unverified', lim, getUnverifiedListings);
router.patch('/listings/:id/verify', lim, verifyListing);
router.get('/activity',         lim, getActivityStream);
router.get('/reports',          lim, getReports);
router.get('/users',            lim, getUsers);
router.patch('/users/:id/role',  lim, updateUserRole);

// Shop claim management
router.get('/claims',            lim, getClaims);
router.post('/claims/:id/respond', lim, respondToClaim);

export default router;
