// Design tokens — single source of truth for colours, fonts, springs
//
// COLOR values are CSS custom property references (var(--x)), not raw hex.
// This means every one of the ~130 places across the app that destructure
// COLOR.gold / COLOR.textPrimary / etc into inline styles automatically
// re-renders with the correct colour when the theme changes — because the
// actual colour values live on :root in index.css (light/dark/auto), and
// React's inline style engine fully supports CSS var() strings. No need to
// touch any component that already uses COLOR.* — this was the only way to
// add theming without a risky rewrite of every file.
export const COLOR = {
  void:        'var(--c-void)',
  voidDeep:    'var(--c-void-deep)',
  glass:       'var(--c-glass)',
  gold:        'var(--c-gold)',
  goldDim:     'var(--c-gold-dim)',
  edge:        'var(--c-edge)',
  edge2:       'var(--c-edge2)',
  textPrimary: 'var(--c-text-primary)',
  textMuted:   'var(--c-text-muted)',
  textGhost:   'var(--c-text-ghost)',
};
export const FONT = {
  display:"'Cormorant Garamond',serif",
  mono:"'Geist Mono',monospace",
  body:"'DM Sans',sans-serif",
};
export const SPRING = {
  default:{ type:'spring', stiffness:150, damping:18 },
  gentle: { type:'spring', stiffness:80,  damping:20 },
  snappy: { type:'spring', stiffness:260, damping:22 },
};
// Real service category labels — mirrors server/utils/constants.js
// OSM_BEAUTY_TAG_MAP values exactly. NOT a priced menu — we have no real
// pricing data source, so we never display fabricated prices.
export const CATEGORY_LABELS = {
  hair:       'Hair',
  nails:      'Nails',
  spa:        'Spa & Massage',
  tanning:    'Tanning',
  tattoo:     'Tattoo',
  piercing:   'Piercing',
  perfumery:  'Perfumery',
  cosmetics:  'Cosmetics',
};
export const CATEGORY_FILTERS = Object.entries(CATEGORY_LABELS).map(([tag,label])=>({tag,label}));

export const GENDER_FILTERS = [
  {value:'any',    label:'All'},
  {value:'unisex', label:'Unisex'},
  {value:'male',   label:'Men'},
  {value:'female', label:'Women'},
];

export const PHOTO_KEYWORDS = {
  hair:       'hair+salon+interior+india',
  nails:      'nail+salon+luxury+india',
  spa:        'luxury+spa+salon+india',
  tanning:    'salon+interior+india',
  tattoo:     'tattoo+studio+interior',
  piercing:   'piercing+studio+interior',
  perfumery:  'perfume+boutique+interior',
  cosmetics:  'cosmetics+store+interior',
  default:    'beauty+salon+india+interior',
};
// Get a real salon photo URL.
// source.unsplash.com was permanently shut down (Sept 2024) — DO NOT use it.
// We use Picsum (picsum.photos) seeded deterministically per salon — it's a
// real, currently-live, free, no-key image CDN. Seed ensures the SAME salon
// always gets the SAME photo (not random on every render).
export function getSalonPhoto(salon, idx=0) {
  const seedSource = salon.osmId || salon._id || salon.name || `s${idx}`;
  const seed = String(seedSource).replace(/[^a-zA-Z0-9]/g,'').slice(-10) || `seed${idx}`;
  return `https://picsum.photos/seed/${seed}/600/380`;
}
// Parse OSM opening_hours string → { label, isOpen, known }
export function parseOpeningHours(raw) {
  if(!raw||raw==='unknown') return {label:'Hours not listed',isOpen:null,known:false};
  if(raw.includes('24/7')||raw==='Mo-Su 00:00-24:00') return {label:'Open 24 hours',isOpen:true,known:true};
  const m = raw.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
  if(m) {
    const now = new Date(), h = now.getHours()+now.getMinutes()/60;
    const open = parseInt(m[1])+parseInt(m[2])/60, close = parseInt(m[3])+parseInt(m[4])/60;
    const isOpen = h>=open && h<close;
    return {label:isOpen?`Open · Closes ${m[3]}:${m[4]}`:`Closed · Opens ${m[1]}:${m[2]}`, isOpen, known:true};
  }
  return {label:raw.slice(0,30),isOpen:null,known:true};
}
// HUB_COORDS removed — coordinates now come live from each hub's centroid,
// computed server-side from real synced salon GPS data (see salonController.js
// getHubs). No static place→coordinate lookup table needed anymore.
