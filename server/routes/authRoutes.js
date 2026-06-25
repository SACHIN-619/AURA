import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  signup, 
  login, 
  getMe, 
  changePassword, 
  updateAvatar, 
  removeAvatar, 
  requireAuth 
} from '../controllers/authController.js';

const router = express.Router();

// Stricter limit on auth endpoints — these are the most sensitive to abuse
// (credential stuffing, account enumeration).
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { success: false, error: 'Too many attempts — please wait 15 minutes' } 
});

const avatarLimiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 10, 
  message: { success: false, error: 'Too many avatar requests' } 
});

// Middleware — must be used AFTER requireAuth. Blocks non-owners from 
// reaching owner-specific API actions. Admins get a pass-through because 
// they hold master overrides.
export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Owner access required' });
  }
  next();
}

// Authentication Routes
// signup securely processes both client and 'owner' profiles via req.body.accountType
router.post('/signup',    authLimiter, signup);
router.post('/login',     authLimiter, login);
router.get('/me',         requireAuth, getMe);

// Settings & Security Profile updates
router.patch('/password', authLimiter, requireAuth, changePassword);
router.patch('/avatar',   avatarLimiter, requireAuth, updateAvatar);
router.delete('/avatar',  avatarLimiter, requireAuth, removeAvatar);

export default router;