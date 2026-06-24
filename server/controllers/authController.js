// server/controllers/authController.js
//
// Real signup/login with bcrypt password hashing and JWT issuance.
// Signup ALWAYS creates role:'user' — there is no field a client can send
// to make themselves an admin. The only way an account becomes admin is
// you manually editing { role: 'admin' } on that user's document directly
// in MongoDB. The JWT this controller issues simply carries whatever role
// is currently on the document at login time — so promoting someone takes
// effect the next time they log in (or you can force it by asking them to
// log out and back in).
import jwt    from 'jsonwebtoken';
import User   from '../models/User.js';
import { awardXp } from '../utils/xp.js';
import { uploadAvatar, deleteAvatar, isUploadConfigured } from '../services/uploadService.js';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL   = '30d';

function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function sanitize(user) {
  const { _id, email, name, phone, role, xp, level, avatarUrl, createdAt } = user;
  return { _id, email, name, phone, role, xp: xp || 0, level: level || 1, avatarUrl: avatarUrl || null, createdAt };
}

export const signup = async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ success: false, error: 'Auth is not configured on this server (JWT_SECRET missing)' });
  }
  const { email, name, password, phone } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ success: false, error: 'email, name, and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });

    let user;
    let isNewAccount = false;
    if (existing) {
      // This email already exists from a silent booking-upsert (no password
      // set yet) — let them claim the account by setting a password now,
      // rather than blocking signup with a confusing "already exists" error.
      if (existing.passwordHash) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists. Try logging in instead.' });
      }
      existing.name = name.trim();
      if (phone) existing.phone = phone;
      await existing.setPassword(password);
      user = await existing.save();
    } else {
      user = new User({ email: email.toLowerCase().trim(), name: name.trim(), phone, role: 'user' });
      await user.setPassword(password);
      await user.save();
      isNewAccount = true;
    }

    // Award signup XP only once, for a genuinely new account — not for the
    // "claim an existing silently-created record" path, since that wasn't
    // really a fresh signup action.
    if (isNewAccount) {
      const xpResult = await awardXp(User, user._id, 'signup');
      if (xpResult) { user.xp = xpResult.totalXp; user.level = xpResult.level; }
    }
    // Bonus: completing the optional phone field at signup counts as profile completion
    if (phone && phone.trim()) {
      const xpResult = await awardXp(User, user._id, 'profile_completed');
      if (xpResult) { user.xp = xpResult.totalXp; user.level = xpResult.level; }
    }

    const token = issueToken(user);
    return res.status(201).json({ success: true, token, user: sanitize(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ success: false, error: 'Auth is not configured on this server (JWT_SECRET missing)' });
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    user.lastActiveAt = new Date();
    await user.save();

    const token = issueToken(user);
    return res.json({ success: true, token, user: sanitize(user) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/auth/me — returns the current account from a valid JWT, so the
// frontend can confirm role on app load without re-sending credentials.
export const getMe = async (req, res) => {
  // req.user is populated by requireAuth middleware below
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/auth/avatar — uploads a profile photo via Cloudinary. Identity
// comes from the JWT, never a client-supplied user ID. If Cloudinary isn't
// configured, returns a clear error rather than silently storing raw
// base64 in MongoDB (which would bloat the DB and isn't a real "upload").
export const updateAvatar = async (req, res) => {
  if (!isUploadConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Avatar upload is not configured on this server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (free tier, no card required at cloudinary.com).',
    });
  }
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ success: false, error: 'imageBase64 required' });
  }
  try {
    const dataUri = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    const url = await uploadAvatar(dataUri, req.user.sub);
    const user = await User.findByIdAndUpdate(req.user.sub, { avatarUrl: url }, { new: true });
    return res.json({ success: true, avatarUrl: url, user: sanitize(user) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/auth/avatar — removes the current avatar, reverts to the
// default initials-based display.
export const removeAvatar = async (req, res) => {
  try {
    await deleteAvatar(req.user.sub);
    const user = await User.findByIdAndUpdate(req.user.sub, { avatarUrl: null }, { new: true });
    return res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/auth/password — requires the CURRENT password to be supplied
// and verified before allowing a change. Identity comes from the JWT
// (req.user.sub), never from a client-supplied user ID — you can only ever
// change your own password, never someone else's by guessing their ID.
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
  }
  try {
    const user = await User.findById(req.user.sub).select('+passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const valid = await user.checkPassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    await user.setPassword(newPassword);
    await user.save();
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Middleware — verifies the Authorization: Bearer <token> header. Attaches
// the decoded payload (sub, email, role) to req.user for downstream routes.
export function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(503).json({ success: false, error: 'Auth is not configured on this server' });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing Authorization token' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Middleware — must be used AFTER requireAuth. Blocks non-admins from
// reaching admin-only routes. This checks the role embedded in the verified
// JWT, which itself reflects whatever role was on the DB document at the
// time the token was issued (i.e. at their last login).
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
