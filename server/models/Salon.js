// server/models/Salon.js
//
// Honesty note: `serviceCategories` reflects real OSM `beauty=*` tags when
// present — it is NOT a priced menu, because OSM doesn't carry pricing data
// for these POIs. `ratingSource` makes clear whether `luxuryRating` and
// `reviewCount` came from a real source or are a clearly-labeled synthetic
// placeholder shown only until real review data is integrated.
import mongoose from 'mongoose';

const SalonSchema = new mongoose.Schema({
  osmId:        { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true, trim: true },
  hub:          { type: String, required: true, index: true },
  location:     { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  address:      { street: String, suburb: String, city: { type: String, default: 'Hyderabad' }, postcode: String, state: { type: String, default: 'Telangana' } },
  contact:      { phone: String, website: String, email: String },
  openingHours: { type: String },

  // Famous Landmarks near this salon for proximity matching
  proximityLandmarks: [{
    name: { type: String },
    distanceKm: { type: Number }
  }],

  // UI Image Matrix for premium bento-box layouts (Enriched with AI Sync Nodes)
  images: {
    banner: { type: String, default: null },
    thumbnail: { type: String, default: null },
    gallery: [{ type: String }],
    // 4-Layer Mesh Engine Fields
    aiMediaUrl: { type: String, default: null },
    aiFallbackUrl: { type: String, default: null },
    aiTags: { type: String, default: null },
    lastAiEnrichedAt: { type: Date, default: null }
  },

  serviceCategories: { type: [String], default: [] },
  servesGender: { type: String, enum: ['unisex','male','female', null], default: null },

  luxuryRating:  { type: Number, min: 1, max: 5, default: null },
  reviewCount:   { type: Number, default: null },
  ratingSource:  { type: String, enum: ['synthetic_placeholder','real'], default: 'synthetic_placeholder' },

  // Matches exact smoke test enum constraints
  tier:         { type: String, enum: ['platinum','gold','silver','unrated'], default: 'unrated' },
  isFeatured:   { type: Boolean, default: false },
  lastSyncedAt: { type: Date, default: Date.now },

  // Optional price tier classifications set by verified admins
  priceTier: { type: String, enum: ['Budget', 'Moderate', 'Luxury', 'Premium Luxury', null], default: null },

  aiResearchData: {
    summary: { type: String, default: null },
    estimatedBasePrice: { type: String, default: null }
  },

  listingVerified:   { type: Boolean, default: false },
  listingVerifiedAt: { type: Date, default: null },
  listingVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  badgeType: { type: String, enum: ['AURA_VERIFIED', 'NONE'], default: 'NONE' },

  owner:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  services:          [{ name: String, category: String, price: Number }],

  // Claim flow — user submits claim, admin approves/rejects with optional message
  claimPending:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // user who submitted claim
  claimPendingAt:    { type: Date, default: null },
  claimPendingName:  { type: String, default: null }, // search name they used
  claimStatus:       { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  claimAdminMessage: { type: String, default: null }, // admin response message
  claimResolvedAt:   { type: Date, default: null },

  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    details: String,
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' }
  }]
}, { timestamps: true, versionKey: false });

SalonSchema.index({ location: '2dsphere' });
SalonSchema.index({ hub: 1, luxuryRating: -1 });
SalonSchema.index({ serviceCategories: 1 });

export default mongoose.model('Salon', SalonSchema);