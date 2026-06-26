// server/routes/salonRoutes.js
import express from 'express';
import { getSalons, getSalonById, getNearbySalons, getFeatured, getHubs, reportSalon, claimSalon } from '../controllers/salonController.js';
import { requireAuth } from '../controllers/authController.js';

const router = express.Router();

router.get('/featured', getFeatured);
router.get('/nearby', getNearbySalons);
router.get('/hubs', getHubs);
router.get('/', getSalons);
router.get('/:id', getSalonById);
router.post('/:id/report', reportSalon);
router.post('/claim', requireAuth, claimSalon);

export default router;