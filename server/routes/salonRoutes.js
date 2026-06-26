// server/routes/salonRoutes.js
// IMPORTANT: /claim MUST be before /:id — otherwise Express matches 'claim' as an id param
import express from 'express';
import { getSalons, getSalonById, getNearbySalons, getFeatured, getHubs, reportSalon, claimSalon, cancelClaim } from '../controllers/salonController.js';
import { requireAuth } from '../controllers/authController.js';

const router = express.Router();

router.get('/featured', getFeatured);
router.get('/nearby', getNearbySalons);
router.get('/hubs', getHubs);
router.get('/', getSalons);

// Claim routes BEFORE /:id to prevent 'claim' being treated as a salon id
router.post('/claim',        requireAuth, claimSalon);
router.delete('/claim',      requireAuth, cancelClaim);

router.get('/:id',           getSalonById);
router.post('/:id/report',   reportSalon);

export default router;