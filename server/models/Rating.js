// server/models/Rating.js
//
// AURA's own real rating system — fed by actual users after an actual
// booking interaction (WhatsApp contact or AURA request), not scraped or
// fabricated. Each rating is tied to a real booking record, so we can mark
// it "AuraVerified" when the rater genuinely went through our booking flow
// for that salon. Unverified ratings (e.g. someone rates without booking
// first) are still stored but flagged so the UI can treat them differently.
import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
  salonId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null }, // null = unverified rating
  customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  customerName:  { type: String, required: true, trim: true, maxlength: 60 },

  stars:   { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 },

  // True only when bookingId references a real Booking made by this same
  // email for this same salon — set server-side, never trusted from client.
  isVerified: { type: Boolean, default: false },

  // Admin moderation — lets a human (you) review/hide spam or abusive ratings
  status: { type: String, enum: ['visible','hidden','flagged'], default: 'visible' },
}, { timestamps: true, versionKey: false });

// One rating per email per salon — prevents spamming the same salon repeatedly.
// Users can update their existing rating instead of creating duplicates.
RatingSchema.index({ salonId: 1, customerEmail: 1 }, { unique: true });

export default mongoose.model('Rating', RatingSchema);
