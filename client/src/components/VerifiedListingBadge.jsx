// VerifiedListingBadge — shield icon, distinct from VerifiedBadge (the gold
// star-burst used for "this rating came from a real booking"). This one
// means "an AURA admin manually confirmed this salon's basic info (name,
// address, contact, category) is accurate." Different shape AND different
// color on purpose so the two meanings are never visually confused.
export default function VerifiedListingBadge({ size = 16 }) {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}
      title="AURA Verified Listing — confirmed accurate by our team"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="listingVerifiedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7FE3D8" />
            <stop offset="100%" stopColor="#2BA39A" />
          </linearGradient>
        </defs>
        <path
          d="M12 2 L20 5.5 V11.5 C20 16.5 16.5 20 12 22 C7.5 20 4 16.5 4 11.5 V5.5 Z"
          fill="url(#listingVerifiedGrad)"
        />
        <path d="M8 12 L10.7 14.7 L16 9" fill="none" stroke="#0d2b28" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
