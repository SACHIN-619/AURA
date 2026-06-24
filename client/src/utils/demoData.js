// Demo data — shown ONLY when the backend is unreachable and OSM sync also
// fails, so the user never sees a blank/broken screen. Every record is
// explicitly tagged _isDemo:true and the UI must show a visible "DEMO DATA"
// badge — this is placeholder content, never presented as real salons.
import { CATEGORY_LABELS } from './tokens.js';

const SUBS  = ['Road No.36','Film Nagar','Kavuri Hills','Main Road','Heritage Heights','Cyber Hub','Boulevard','Park Lane'];
const HOURS = ['Mo-Sa 09:00-20:00','Mo-Su 10:00-21:00','Tu-Su 09:30-19:30','Mo-Sa 08:00-20:00','24/7','Mo-Fr 10:00-20:00','Mo-Sa 09:00-21:00','Mo-Su 11:00-20:00'];
const NAMES = ['Prestige Demo Studio','Sample Grooming Co.','Demo Salon & Co.','Placeholder Beauty Lounge','Example Suite','Demo Meridian Salon','Sample Grooming House','Demo Beauty Studio'];
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
const GENDERS = ['unisex','male','female','unisex','male','unisex','female','unisex'];

// Approximate centroid per hub — used ONLY to scatter demo pins plausibly
// on a map. Has no bearing on real salon locations once live data exists.
const HUB_C = {
  'Jubilee Hills':[78.4102,17.4308],'Banjara Hills':[78.4499,17.4177],
  'Gachibowli':[78.3519,17.4437],'Hitech City':[78.3762,17.4484],
  'Madhapur':[78.3916,17.4409],'Kondapur':[78.3603,17.4601],
  'Kukatpally':[78.3995,17.4849],'Ameerpet':[78.4487,17.4374],
};
const FALLBACK_CENTRE = [78.4867, 17.3850]; // central Hyderabad, used if hub unknown

export function buildDemoSalons(hub) {
  const c = HUB_C[hub] || FALLBACK_CENTRE;
  return NAMES.map((name, i) => ({
    _id: `demo-${(hub||'area').replace(/\s/g,'')}-${i}`,
    osmId: `demo_${i}`,
    name: `${name} (Demo)`,
    hub: hub || 'Hyderabad',
    // No fake rating/review count — honestly null, matching real schema
    luxuryRating: null,
    reviewCount: null,
    ratingSource: 'synthetic_placeholder',
    tier: 'unrated',
    openingHours: HOURS[i % HOURS.length],
    serviceCategories: [CATEGORY_KEYS[i % CATEGORY_KEYS.length]],
    servesGender: GENDERS[i % GENDERS.length],
    address: { suburb: SUBS[i % SUBS.length], city: 'Hyderabad', state: 'Telangana' },
    contact: {},
    location: {
      type: 'Point',
      coordinates: [
        +(c[0] + (Math.random()-0.5)*0.025).toFixed(6),
        +(c[1] + (Math.random()-0.5)*0.025).toFixed(6),
      ],
    },
    _isDemo: true,
  }));
}
