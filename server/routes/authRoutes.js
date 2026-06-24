import express from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, getMe, changePassword, updateAvatar, removeAvatar, requireAuth } from '../controllers/authController.js';

const router = express.Router();

// Stricter limit on auth endpoints — these are the most sensitive to abuse
// (credential stuffing, account enumeration).
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { success: false, error: 'Too many attempts — please wait 15 minutes' } });
const avatarLimiter = rateLimit({ windowMs: 60*1000, max: 10, message: { success: false, error: 'Too many avatar requests' } });

router.post('/signup',   authLimiter, signup);
router.post('/login',    authLimiter, login);
router.get('/me',        requireAuth, getMe);
router.patch('/password', authLimiter, requireAuth, changePassword);
router.patch('/avatar',  avatarLimiter, requireAuth, updateAvatar);
router.delete('/avatar', avatarLimiter, requireAuth, removeAvatar);

export default router;
