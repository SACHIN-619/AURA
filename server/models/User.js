// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name:  { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, trim: true },

  passwordHash: { type: String, default: null, select: false },

  // Updated enum to allow 'owner' alongside 'user' and 'admin'
  role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' },

  preferredHubs:     { type: [String], default: [] },
  preferredServices: { type: [String], default: [] },
  totalBookings:  { type: Number, default: 0 },
  lastActiveAt:   { type: Date, default: Date.now },
  marketingConsent: { type: Boolean, default: false },
  avatarUrl: { type: String, default: null },
  xp:    { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  hasUsedAiSearch: { type: Boolean, default: false },
  
  activityLog: [{
    action: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  mirrorHistory: [{
    imageUrl: String,
    result: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true, versionKey: false });

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};
UserSchema.methods.checkPassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', UserSchema);

//// older model

// // server/models/User.js
// //
// // Real account model with password (bcrypt-hashed, never stored plain) and
// // a role field. Signup always creates role:'user' — there is NO signup flow
// // that lets a client set their own role to 'admin'. To promote someone to
// // admin, you manually edit role:'admin' directly in MongoDB (Atlas UI or
// // mongosh). On their next login, the JWT issued will carry role:'admin' and
// // the frontend routes them to the admin dashboard instead of the normal app.
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const UserSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
//   name:  { type: String, required: true, trim: true, maxlength: 80 },
//   phone: { type: String, trim: true },

//   // Hashed password — null for users created via the old silent
//   // booking-upsert path who never signed up with a password. Those users
//   // can still book (no account required), but cannot log in until they
//   // explicitly sign up with this same email.
//   passwordHash: { type: String, default: null, select: false },

//   // 'user' is the only role signup can ever create. 'admin' is set by
//   // directly editing the document in MongoDB — never via any API request.
//   role: { type: String, enum: ['user', 'admin'], default: 'user' },

//   preferredHubs:     { type: [String], default: [] },
//   preferredServices: { type: [String], default: [] },
//   totalBookings:  { type: Number, default: 0 },
//   lastActiveAt:   { type: Date, default: Date.now },
//   marketingConsent: { type: Boolean, default: false },

//   // Profile photo — a Cloudinary URL once uploaded (free tier, no card
//   // required at signup). Genuinely optional: null means "show initials
//   // avatar," never a placeholder photo pretending to be a real upload.
//   avatarUrl: { type: String, default: null },

//   // XP system — every point is awarded server-side for an action we can
//   // actually verify happened (signup, profile completed, rating submitted,
//   // AI search used, etc). NOT awarded for unverifiable claims like "did you
//   // really get a haircut" — we have no way to confirm that, so we don't
//   // pretend to. See server/utils/xp.js for the full, honest point table.
//   xp:    { type: Number, default: 0 },
//   level: { type: Number, default: 1 },
//   // One-time-only XP flags — prevents farming "first X" bonuses repeatedly.
//   hasUsedAiSearch: { type: Boolean, default: false },
// }, { timestamps: true, versionKey: false });

// UserSchema.methods.setPassword = async function (plain) {
//   this.passwordHash = await bcrypt.hash(plain, 10);
// };
// UserSchema.methods.checkPassword = async function (plain) {
//   if (!this.passwordHash) return false;
//   return bcrypt.compare(plain, this.passwordHash);
// };

// export default mongoose.model('User', UserSchema);
