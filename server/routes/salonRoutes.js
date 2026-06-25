// server/routes/salonRoutes.js
import express from 'express';
import { getSalons, getSalonById, getNearbySalons, getFeatured, getHubs } from '../controllers/salonController.js';

const router = express.Router();

router.get('/featured', getFeatured);
router.get('/nearby', getNearbySalons);
router.get('/hubs', getHubs);
router.get('/', getSalons);
router.get('/:id', getSalonById);

export default router;