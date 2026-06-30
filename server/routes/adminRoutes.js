import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getOverview, getRecentBookings, getModerationQueue, getDataGaps, getAnalytics,
  verifyListing, getUnverifiedListings, getActivityStream, getReports, getUsers,
  updateUserRole, getClaims, respondToClaim, createSalon, bulkRejectOrphanedClaims,
  getAllSalons, updateSalon, toggleSalonDisabled, toggleUserDisabled,
  getNullSearches, dismissReport, replyToReport, scanFakeSalons, revokeFakeClaims,
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60*1000, max: 120, message: { success: false, error: 'Too many admin requests' } });

// Every route here requires a valid JWT (requireAuth) AND role='admin'.
// Role can ONLY become admin via direct MongoDB edit — no API can set it.
router.use(requireAuth, requireAdmin);

// ── Overview & Analytics ────────────────────────────────────────────────────
router.get('/overview',         lim, getOverview);
router.get('/analytics',        lim, getAnalytics);
router.get('/activity',         lim, getActivityStream);
router.get('/null-searches',    lim, getNullSearches);

// ── AI Scanner (Audits placeholder / spam / fake data) ─────────────────────
router.get('/scanner/scan',     lim, scanFakeSalons);
router.post('/scanner/revoke',  lim, revokeFakeClaims);

// ── Bookings & Moderation ───────────────────────────────────────────────────
router.get('/bookings',         lim, getRecentBookings);
router.get('/moderation-queue', lim, getModerationQueue);
router.get('/data-gaps',        lim, getDataGaps);
router.get('/reports',          lim, getReports);

// ── Salons / Listings ───────────────────────────────────────────────────────
router.post('/salons',                          lim, createSalon);
router.get('/salons',                           lim, getAllSalons);
router.patch('/salons/:id',                     lim, updateSalon);
router.patch('/salons/:id/disabled',            lim, toggleSalonDisabled);
router.get('/listings/unverified',              lim, getUnverifiedListings);
router.patch('/listings/:id/verify',            lim, verifyListing);

// ── Reports ─────────────────────────────────────────────────────────────────
router.patch('/salons/:id/reports/:reportId',   lim, dismissReport);
router.post('/salons/:salonId/reports/:reportId/reply', lim, replyToReport);

// ── Users ───────────────────────────────────────────────────────────────────
router.get('/users',                lim, getUsers);
router.patch('/users/:id/role',     lim, updateUserRole);
router.patch('/users/:id/disabled', lim, toggleUserDisabled);

// ── Shop Claims — bulk-reject MUST come before /:id/respond to avoid param conflict
router.post('/claims/bulk-reject-orphaned', lim, bulkRejectOrphanedClaims);
router.get('/claims',                       lim, getClaims);
router.post('/claims/:id/respond',          lim, respondToClaim);

export default router;
