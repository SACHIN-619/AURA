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

  // Real category tags extracted from OSM `beauty=*` when present.
  // Empty array means OSM had no service detail for this salon — the UI
  // must show "Contact salon for services & pricing", not invent a menu.
  serviceCategories: { type: [String], default: [] },

  // Who the salon serves, ONLY if OSM actually tagged it (unisex/male/female).
  // null = unknown, never assumed.
  servesGender: { type: String, enum: ['unisex','male','female', null], default: null },

  // luxuryRating/reviewCount are clearly flagged when synthetic. We do not
  // pretend Math.random() output is a real Google rating.
  luxuryRating:  { type: Number, min: 1, max: 5, default: null },
  reviewCount:   { type: Number, default: null },
  ratingSource:  { type: String, enum: ['synthetic_placeholder','real'], default: 'synthetic_placeholder' },

  tier:         { type: String, enum: ['platinum','gold','silver','unrated'], default: 'unrated' },
  isFeatured:   { type: Boolean, default: false },
  lastSyncedAt: { type: Date, default: Date.now },

  // AURA Verified Listing — distinct from rating verification (Rating.js
  // isVerified, which means "this reviewer actually booked here"). This
  // means an admin manually confirmed the salon's basic info (name, address,
  // contact, category) is accurate. Set ONLY by an admin-role account via
  // PATCH /api/admin/salons/:id/verify — never inferred, never automatic,
  // never settable by anyone else including the salon "owner" since there's
  // no owner-claim system yet.
  listingVerified:   { type: Boolean, default: false },
  listingVerifiedAt: { type: Date, default: null },
  listingVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

SalonSchema.index({ location: '2dsphere' });
SalonSchema.index({ hub: 1, luxuryRating: -1 });
SalonSchema.index({ serviceCategories: 1 });

export default mongoose.model('Salon', SalonSchema);
