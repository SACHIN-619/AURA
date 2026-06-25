// RateItButton — Compact inline button shown when a salon has zero ratings.
// Animation fires ONLY on mouse hover; stays fully static otherwise.
// Designed to sit inline beside 5 empty star outlines (see RatingDisplay).
import { useState } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const STAR_PATH = "M50,8 L63,35 L93,39 L71,60 L76,90 L50,76 L24,90 L29,60 L7,39 L37,35 Z";

export default function RateItButton({ onClick }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={S.wrap}
      aria-label="Rate this salon"
    >
      {/* Side burst stars — appear only on hover */}
      <div style={S.canvas}>
        <svg viewBox="0 0 100 100" width={10} height={10}
          style={{
            ...S.sideStar,
            left: -4,
            opacity: hovered ? 0.9 : 0,
            transform: hovered ? 'scale(1) translateX(-2px)' : 'scale(0.4) translateX(0)',
          }}
        >
          <path d={STAR_PATH} fill="none" stroke="#D4AF37" strokeWidth="8" strokeLinejoin="round" />
        </svg>

        {/* Core rotating star */}
        <motion.svg
          viewBox="0 0 100 100"
          width={13}
          height={13}
          animate={hovered ? { rotate: 360 } : { rotate: 0 }}
          transition={hovered ? { duration: 0.6, ease: 'easeInOut' } : { duration: 0 }}
          style={{ filter: hovered ? 'drop-shadow(0 0 4px #ffd700)' : 'none', flexShrink: 0 }}
        >
          <path d={STAR_PATH} fill={hovered ? '#D4AF37' : 'none'} stroke="#D4AF37" strokeWidth="7" strokeLinejoin="round" />
        </motion.svg>

        <svg viewBox="0 0 100 100" width={10} height={10}
          style={{
            ...S.sideStar,
            right: -4,
            opacity: hovered ? 0.9 : 0,
            transform: hovered ? 'scale(1) translateX(2px)' : 'scale(0.4) translateX(0)',
          }}
        >
          <path d={STAR_PATH} fill="none" stroke="#D4AF37" strokeWidth="8" strokeLinejoin="round" />
        </svg>
      </div>

      <span style={{ ...S.label, color: hovered ? COLOR.gold : COLOR.textGhost }}>
        {t('rating_rate_it') || 'Rate It'}
      </span>
    </button>
  );
}

const S = {
  wrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.5rem 0.2rem 0.35rem',
    background: 'rgba(212,175,55,0.04)',
    border: '1px solid rgba(212,175,55,0.18)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    flexShrink: 0,
  },
  canvas: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  sideStar: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    transition: 'opacity 0.25s, transform 0.25s',
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: '0.52rem',
    letterSpacing: '0.12em',
    transition: 'color 0.2s',
    whiteSpace: 'nowrap',
  },
};
