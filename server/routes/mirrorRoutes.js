// server/routes/mirrorRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeImage } from '../controllers/mirrorController.js';
import { optionalAuth } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60000, max: 10, message: { success: false, error: 'Too many mirror requests' } });

// optionalAuth: guests can use Mirror freely; logged-in users get XP rewards
router.post('/analyze', lim, optionalAuth, analyzeImage);

export default router;