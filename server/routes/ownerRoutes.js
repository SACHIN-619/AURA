import express from 'express';
import { requireAuth } from '../controllers/authController.js';
import { requireOwner } from './authRoutes.js';
import {
  getOwnerDashboard,
  getOwnerServices,
  createOwnerService,
  updateOwnerService,
  deleteOwnerService,
  getOwnerReviewsSentiment
} from '../controllers/ownerController.js';

const router = express.Router();

// Apply auth + owner checks globally for all owner routes
router.use(requireAuth, requireOwner);

router.get('/dashboard', getOwnerDashboard);
router.get('/services', getOwnerServices);
router.post('/services', createOwnerService);
router.put('/services/:id', updateOwnerService);
router.delete('/services/:id', deleteOwnerService);
router.get('/reviews', getOwnerReviewsSentiment);

export default router;
