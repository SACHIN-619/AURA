// server/routes/mirrorRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeImage } from '../controllers/mirrorController.js';
import { requireAuth } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60000, max: 10, message: { success: false, error: 'Too many mirror requests' } });

// Locked securely with requireAuth to guarantee verified user session profile data
router.post('/analyze', lim, requireAuth, analyzeImage);

export default router;