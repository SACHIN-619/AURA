// VerifiedBadge — small premium tick-mark shown next to ratings that came
// from a genuinely verified booking. Inline SVG, no external image asset
// needed, themed to match the gold palette.
import { COLOR } from '../utils/tokens';

export default function VerifiedBadge({ size = 14 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      title="AuraVerified — confirmed real booking"
    >
      <defs>
        <linearGradient id="auraVerifiedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A8" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>
      <path
        d="M12 2 L14.5 4.5 L17.8 3.6 L18.4 6.9 L21.6 8.2 L20 11.2 L21.6 14.2 L18.4 15.5 L17.8 18.8 L14.5 17.9 L12 20.4 L9.5 17.9 L6.2 18.8 L5.6 15.5 L2.4 14.2 L4 11.2 L2.4 8.2 L5.6 6.9 L6.2 3.6 L9.5 4.5 Z"
        fill="url(#auraVerifiedGrad)"
      />
      <path d="M8 12 L10.7 14.7 L16 9" fill="none" stroke="#1a1410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
