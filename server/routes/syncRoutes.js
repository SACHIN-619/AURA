// server/routes/syncRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { syncHub, syncStatus } from '../controllers/syncController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60000, max: 5, message: { success: false, error: 'Too many sync requests' } });

// Secure Sync Endpoints behind Admin privileges
router.post('/hub', lim, requireAuth, requireAdmin, syncHub);
router.get('/status', requireAuth, requireAdmin, syncStatus);

export default router;