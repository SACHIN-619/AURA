// server/services/uploadService.js
//
// Cloudinary integration for profile avatar uploads. Free tier (25GB
// storage/bandwidth), card-free signup at cloudinary.com.
//
// Honest fallback: if CLOUDINARY_* env vars aren't set, upload requests
// fail with a clear 503 explaining exactly what's missing — we do NOT
// silently store the raw base64 in MongoDB as a fake "upload," which would
// bloat the database and isn't what the user asked for.
import { v2 as cloudinary } from 'cloudinary';

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
  return true;
}

export function isUploadConfigured() {
  return ensureConfigured();
}

// Uploads a base64 data URI, returns the secure HTTPS URL. Constrains size
// and applies a face-aware crop so avatars look consistent regardless of
// the original photo's aspect ratio.
export async function uploadAvatar(base64DataUri, userId) {
  if (!ensureConfigured()) {
    throw new Error('Avatar upload is not configured on this server (CLOUDINARY_* env vars missing)');
  }
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: 'aura-avatars',
    public_id: `user_${userId}`,
    overwrite: true,
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  return result.secure_url;
}

export async function uploadSalonImage(base64DataUri, salonId, index) {
  if (!ensureConfigured()) {
    throw new Error('Image upload is not configured on this server (CLOUDINARY_* env vars missing)');
  }
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: 'aura-salons',
    public_id: `salon_${salonId}_img_${index}_${Date.now()}`,
    overwrite: true,
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
  return result.secure_url;
}

export async function deleteAvatar(userId) {
  if (!ensureConfigured()) return; // nothing to clean up if not configured
  try {
    await cloudinary.uploader.destroy(`aura-avatars/user_${userId}`);
  } catch { /* best-effort cleanup, never block account deletion on this */ }
}
