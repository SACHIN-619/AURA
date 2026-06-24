import express from 'express';
import rateLimit from 'express-rate-limit';
import { createBooking, cancelBooking, getDashboard, trackEvent } from '../controllers/bookingController.js';
const router = express.Router();
const lim = rateLimit({windowMs:60000,max:20,message:{success:false,error:'Too many booking requests'}});

router.post('/',                  lim, createBooking);
router.patch('/:id/cancel',       cancelBooking);
router.get('/dashboard/:salonId', getDashboard);
router.post('/track',             trackEvent);

// NOTE: GET /mine (the old getMyBookings, keyed by an unauthenticated email
// query param) was removed — it let anyone read anyone's booking history
// by guessing their email, the same vulnerability already fixed in
// userController.js. The real, secure equivalent is GET /api/users/profile
// (requires a valid JWT, returns bookings for the authenticated user only).
export default router;
