// icons.jsx — minimal line-icon set, replaces emoji for a more polished,
// boutique-storefront feel. Emoji render inconsistently across OS/browser
// (different weight, color, baseline) which undermines a designed look.
// These are intentionally simple single-path/stroke icons matching the
// gold line-art aesthetic already used elsewhere (e.g. VerifiedBadge).
import { COLOR } from '../utils/tokens';

const base = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const PinIcon = ({ color = COLOR.textMuted, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export const PhoneIcon = ({ color = COLOR.textMuted, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <path d="M6.5 3h3l1.5 4-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2C10.5 18.5 5.5 13.5 4.5 6a2 2 0 0 1 2-2Z" />
  </svg>
);

export const GlobeIcon = ({ color = COLOR.textMuted, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
  </svg>
);

export const ClockIcon = ({ color = COLOR.textMuted, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const RouteIcon = ({ color = COLOR.textPrimary, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="18" cy="18" r="2.2" />
    <path d="M6 8.2v3a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4" />
  </svg>
);

export const MessageIcon = ({ color = COLOR.textPrimary, size = 13 }) => (
  <svg {...base} width={size} height={size} stroke={color}>
    <path d="M4 5h16v11H8l-4 4V5Z" />
  </svg>
);

export const SparkleIcon = ({ color = COLOR.gold, size = 13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
  </svg>
);
