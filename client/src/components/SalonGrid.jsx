// client/components/SalonGrid.jsx
// ── Consumes real context data (live API + OSM + demo fallback) ──────────────
// Previously this component called buildDemoSalons() locally, ignoring
// all the data that syncHub() had already fetched and stored in context.
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getSalonPhoto, estimatePriceTier, parseOpeningHours, COLOR, FONT } from '../utils/tokens';
import SalonCard from './SalonCard';
import { cardVariants } from './SalonCard';

// Inline SVG data URI — shown when both src and Unsplash fail (no network dep)
const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'%3E%3Crect fill='%230d0a13' width='600' height='380'/%3E%3Ccircle cx='300' cy='175' r='55' stroke='%23D4AF37' stroke-width='1.5' fill='none' opacity='0.3'/%3E%3Cpath d='M270 175 Q300 145 330 175 Q300 205 270 175Z' stroke='%23D4AF37' stroke-width='1.2' fill='none' opacity='0.4'/%3E%3Ctext x='300' y='265' text-anchor='middle' fill='%23D4AF37' opacity='0.35' font-size='13' font-family='serif' letter-spacing='4'%3EAURA%3C/text%3E%3C/svg%3E`;

export default function SalonGrid() {
  const { salons, loading, error, syncing, aiMatchIds, activeHub } = useAura();
  const { t } = useLanguage();

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading || syncing) {
    return (
      <div style={S.centerBox}>
        <motion.div
          style={S.loadRing}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <p style={S.loadText}>Discovering luxury nodes in {activeHub || 'your area'}…</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={S.centerBox}>
        <div style={S.errorIcon}>⚠</div>
        <p style={S.errorText}>Could not load salons. Check your connection.</p>
        <p style={S.errorSub}>{String(error)}</p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!salons || salons.length === 0) {
    return (
      <div style={S.emptyBox}>
        <div style={S.emptyIcon}>✦</div>
        <p style={S.emptyTitle}>No luxury salons found</p>
        <p style={S.emptyText}>
          {activeHub
            ? `No salons found in ${activeHub}. Try a different hub or search.`
            : 'Select a hub from the sidebar to discover premium salons.'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="salon-grid"
      style={S.grid}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {salons.map((salon, idx) => {
        if (!salon || typeof salon !== 'object') return null;
        const isMatch = aiMatchIds?.includes(salon._id);
        return (
          <SalonCard
            key={salon._id || `salon-${idx}`}
            salon={salon}
            idx={idx}
            isMatch={isMatch}
          />
        );
      })}
    </motion.div>
  );
}

const S = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.4rem',
    marginTop: '1rem',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    gap: '1rem',
  },
  loadRing: {
    width: 40,
    height: 40,
    border: '2px solid rgba(212,175,55,0.15)',
    borderTop: '2px solid #D4AF37',
    borderRadius: '50%',
  },
  loadText: {
    fontFamily: FONT.mono,
    fontSize: '0.52rem',
    letterSpacing: '0.14em',
    color: COLOR.textMuted,
  },
  emptyBox: {
    padding: '4rem 2rem',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.01)',
    borderRadius: 12,
    border: '1px dashed rgba(212,175,55,0.12)',
    marginTop: '1rem',
  },
  emptyIcon: {
    fontSize: '2rem',
    color: 'rgba(212,175,55,0.3)',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontFamily: FONT.display,
    fontSize: '1.4rem',
    fontWeight: 300,
    color: COLOR.textPrimary,
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontFamily: FONT.mono,
    fontSize: '0.48rem',
    letterSpacing: '0.1em',
    color: COLOR.textGhost,
    maxWidth: 400,
    margin: '0 auto',
  },
  errorIcon: {
    fontSize: '2rem',
    color: 'rgba(239,83,80,0.6)',
    marginBottom: '0.5rem',
  },
  errorText: {
    fontFamily: FONT.display,
    fontSize: '1.2rem',
    fontWeight: 300,
    color: COLOR.textPrimary,
    marginBottom: '0.35rem',
  },
  errorSub: {
    fontFamily: FONT.mono,
    fontSize: '0.44rem',
    color: COLOR.textGhost,
  },
};