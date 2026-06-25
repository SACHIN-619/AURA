// server/routes/salonRoutes.js
import express from 'express';
import { getSalons, getSalonById, getNearbySalons, getFeatured, getHubs, reportSalon } from '../controllers/salonController.js';

const router = express.Router();

router.get('/featured', getFeatured);
router.get('/nearby', getNearbySalons);
router.get('/hubs', getHubs);
router.get('/', getSalons);
router.get('/:id', getSalonById);
router.post('/:id/report', reportSalon);

export default router;