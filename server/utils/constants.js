// server/utils/constants.js — shared constants, single source of truth
//
// IMPORTANT — honesty note on service/pricing data:
// OpenStreetMap does not reliably contain real salon service menus or prices
// for shop=hairdresser / shop=beauty nodes. There is no free, structured data
// source for "this specific Hyderabad salon offers X at ₹Y". We therefore do
// NOT fabricate a fixed service+price list and attach it to every salon —
// that would misrepresent every single result with identical fake pricing.
//
// Instead: extract whatever the OSM `beauty=*` sub-tag (and `unisex`/`male`/
// `female` tags) actually say, and clearly label salons with no tagged detail
// as "Contact salon for services & pricing" in the UI. This is genuinely
// fewer features per card, but it's truthful.

// Maps real OSM `beauty=*` tag values → a human-readable category tag.
// `beauty` can be semicolon-separated (e.g. "hairdresser;nails;massage").
export const OSM_BEAUTY_TAG_MAP = {
  hairdresser: 'hair',
  hair:        'hair',
  nails:       'nails',
  massage:     'spa',
  spa:         'spa',
  tanning:     'tanning',
  tattoo:      'tattoo',
  piercing:    'piercing',
  perfumery:   'perfumery',
  cosmetics:   'cosmetics',
};

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

// HUB_COORDS removed entirely — coordinates are now computed live, server-side,
// from real synced salon GPS data (see salonController.js getHubs aggregation).
