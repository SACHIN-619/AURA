// server/routes/searchRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete } from '../controllers/searchController.js';

const router = express.Router();
const lim = rateLimit({ windowMs: 60000, max: 120, message: { success: false, error: 'Too many requests' } });

router.get('/autocomplete', lim, autocomplete);

export default router;