// RateItButton — animated star prompt shown ONLY when a salon has no
// AuraVerified rating data yet. Converted from a standalone HTML/CSS demo
// into a React + Framer Motion component matching our design system.
// Once a salon has real ratings, this disappears and the real stars show
// instead (see SalonCard / RatingDisplay).
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const STAR_PATH = "M50,8 L63,35 L93,39 L71,60 L76,90 L50,76 L24,90 L29,60 L7,39 L37,35 Z";

export default function RateItButton({ onClick }) {
  const { t } = useLanguage();
  const [shocked, setShocked] = useState(false);
  const [tapping, setTapping] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const loop = () => {
      // 1. finger glides to center (handled visually by CSS position below)
      const t1 = setTimeout(() => {
        setTapping(true);
        setShocked(true);
        const t2 = setTimeout(() => {
          setShocked(false);
          setTapping(false);
        }, 900);
        timers.current.push(t2);
      }, 600);
      timers.current.push(t1);
      const t3 = setTimeout(loop, 3500);
      timers.current.push(t3);
    };
    const start = setTimeout(loop, 1200);
    timers.current.push(start);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <button onClick={onClick} style={S.wrap} aria-label="Rate this salon">
      <div style={S.canvas}>
        {/* Side stars — pop out during the shocked state */}
        <Star size={45} style={{ ...S.sideStar, left: -28, opacity: shocked ? 0.85 : 0, transform: shocked ? 'scale(1)' : 'scale(0.5)' }} />
        <Star size={45} style={{ ...S.sideStar, right: -28, opacity: shocked ? 0.85 : 0, transform: shocked ? 'scale(1)' : 'scale(0.5)' }} />

        {/* Lightning beams — only visible while shocked */}
        {shocked && (
          <div style={S.beamWrap}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ ...S.beam, transform: `translate(-50%,-100%) rotate(${i * 45}deg) translateY(-22px)` }} />
            ))}
          </div>
        )}

        {/* Core star */}
        <motion.div
          style={S.coreWrap}
          animate={shocked ? { scale: [1.06, 1.03], x: [0, -1, 0], y: [0, 1, 0] } : { rotate: 360 }}
          transition={shocked ? { duration: 0.25, repeat: Infinity, repeatType: 'reverse' } : { duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <Star size={68} filter={shocked ? 'drop-shadow(0 0 10px #ffd700)' : 'none'} />
        </motion.div>
      </div>

      <span style={S.label}>{t('rating_rate_it')}</span>
      <span style={S.sub}>{t('rating_no_ratings')}</span>
    </button>
  );
}

function Star({ size, style, filter }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'absolute', ...style, filter, transition: 'opacity 0.3s, transform 0.4s' }}>
      <path d={STAR_PATH} fill="none" stroke="#D4AF37" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const S = {
  wrap:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '0.7rem 0.5rem', cursor: 'pointer', width: '100%' },
  canvas:   { position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  coreWrap: { position: 'relative', width: 68, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sideStar: { top: 8 },
  beamWrap: { position: 'absolute', inset: 0 },
  beam:     { position: 'absolute', top: '50%', left: '50%', width: 3, height: 22, background: '#ffd700', boxShadow: '0 0 6px #fff, 0 0 10px #ffea00', borderRadius: 3 },
  label:    { fontFamily: FONT.mono, fontSize: '0.46rem', letterSpacing: '0.2em', color: COLOR.gold, marginTop: '0.2rem' },
  sub:      { fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.08em', color: COLOR.textGhost },
};
