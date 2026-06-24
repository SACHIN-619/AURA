import express from 'express';
import rateLimit from 'express-rate-limit';
import { upsertUser, getProfile, deleteUser } from '../controllers/userController.js';
import { requireAuth } from '../controllers/authController.js';

const router = express.Router();
const lim = rateLimit({windowMs:60000,max:30,message:{success:false,error:'Too many requests'}});

// upsertUser stays public — it's the silent booking-flow path that doesn't
// require an account at all (booking without logging in is still supported).
router.post('/',        lim, upsertUser);

// These two require a real, verified identity — you can only see or delete
// YOUR OWN profile/data, never anyone else's by guessing their email.
router.get('/profile',  requireAuth, getProfile);
router.delete('/',      lim, requireAuth, deleteUser);

export default router;
