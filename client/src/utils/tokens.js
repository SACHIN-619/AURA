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
// Design tokens — single source of truth for colors, fonts, and springs
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
  display: "'Cormorant Garamond', serif",
  mono:    "'Geist Mono', monospace",
  body:    "'DM Sans', sans-serif",
};

export const SPRING = {
  default: { type: 'spring', stiffness: 150, damping: 18 },
  gentle:  { type: 'spring', stiffness: 80,  damping: 20 },
  snappy:  { type: 'spring', stiffness: 260, damping: 22 },
};

export const CATEGORY_LABELS = {
  hair:       'Hair & Styling',
  nails:      'Nails Architecture',
  spa:        'Spa & Wellness',
  tanning:    'Skin Tanning',
  tattoo:     'Premium Ink/Tattoo',
  piercing:   'Artistic Piercing',
  perfumery:  'Luxury Perfumery',
  cosmetics:  'Aesthetic Cosmetics',
};

export const CATEGORY_FILTERS = Object.entries(CATEGORY_LABELS).map(([tag, label]) => ({ tag, label }));

export const GENDER_FILTERS = [
  { value: 'any',    label: 'All Genders' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'male',   label: 'Men Premium' },
  { value: 'female', label: 'Women Premium' },
];

// Curated list of high-accuracy Unsplash premium luxury commercial interior IDs 
// instead of broken sources or completely random placeholder images.
const PREMIUM_GALLERY = {
  hair:      ['1562322140-22c1000f6475', '1633681926022-84c23e8cb2d6', '1621605815971-fbc98d665033'],
  nails:     ['1604654894610-df4906b1856d', '1519014816548-bf5fe059798b'],
  spa:       ['1540555700478-4be289fbecef', '1600334089648-b0d9d3028eb2', '1519699047748-de8e457a634e'],
  perfumery: ['1541643600914-78b084683601', '1592945403244-b3fbafd7f539'],
  cosmetics: ['1612817288484-6f916006741a', '1522335789203-aabd1fc54bc9'],
  default:   ['1600585154340-be6161a56a0c', '1512290923902-8a9f81dc236c']
};

export function getSalonPhoto(salon) {
  const cats = salon.serviceCategories || [];
  const primaryCat = cats[0] || 'default';
  const idArray = PREMIUM_GALLERY[primaryCat] || PREMIUM_GALLERY.default;
  
  // Deterministic index hash based on salon name to prevent image shifting on re-renders
  let hash = 0;
  const nameStr = salon.name || 'aura';
  for (let i = 0; i < nameStr.length; i++) {
    hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % idArray.length;
  const imageId = idArray[index];
  
  return `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=600&h=380&q=80`;
}

// Dynamically scales pricing metrics based on localized destination weight indices
export function estimatePriceTier(salon) {
  if (salon.priceTier) return salon.priceTier;
  
  const highAffinityHubs = ['Jubilee Hills', 'Banjara Hills', 'Gachibowli', 'Hitech City', 'Nanakramguda', 'Begumpet', 'Durgam Cheruvu', 'Raidurg', 'Panjagutta'];
  const currentHub = salon.hub || '';
  
  const isHighEnd = highAffinityHubs.some(h => currentHub.toLowerCase().includes(h.toLowerCase()));
  const cats = salon.serviceCategories || [];
  
  if (cats.includes('spa') || cats.includes('perfumery')) {
    return { tier: '₹₹₹₹', range: '₹4,500 - ₹15,000+', label: 'Elite Premium' };
  }
  if (isHighEnd) {
    return { tier: '₹₹停', range: '₹2,500 - ₹6,500', label: 'Luxury Premium' };
  }
  return { tier: '₹₹', range: '₹800 - ₹2,200', label: 'Standard Luxury' };
}

export function parseOpeningHours(raw) {
  if (!raw || raw === 'unknown') return { label: 'Hours listed by request', isOpen: null, known: false };
  if (raw.includes('24/7') || raw === 'Mo-Su 00:00-24:00') return { label: 'Open 24 Hours', isOpen: true, known: true };
  
  const m = raw.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
  if (m) {
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    const open = parseInt(m[1]) + parseInt(m[2]) / 60, close = parseInt(m[3]) + parseInt(m[4]) / 60;
    const isOpen = h >= open && h < close;
    return { label: isOpen ? `Open · Closes ${m[3]}:${m[4]}` : `Closed · Opens ${m[1]}:${m[2]}`, isOpen, known: true };
  }
  return { label: raw.slice(0, 30), isOpen: null, known: true };
}