// client/components/LanguageSelector.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT } from '../utils/tokens';

// ── Resolve language list from VITE env var ──────────────────────────────────
// VITE_MARKETPLACE_LANGUAGES is a JSON array set in client/.env
// Fallback: essential Indian languages matching the Hyderabad market
const SAFE_FALLBACK = [
  { code: 'en', native: 'English',   label: 'PRIMARY / IN' },
  { code: 'te', native: 'తెలుగు',    label: 'REGIONAL / TS' },
  { code: 'hi', native: 'हिन्दी',    label: 'NATIONAL / IN' },
  { code: 'ur', native: 'اردو',      label: 'LOCAL / UR' },
];

function resolveLanguages() {
  try {
    const raw = import.meta.env.VITE_MARKETPLACE_LANGUAGES;
    if (!raw) return SAFE_FALLBACK;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return SAFE_FALLBACK;
  } catch {
    return SAFE_FALLBACK;
  }
}

const LANGUAGES = resolveLanguages();

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} className="lang-wrap" style={S.wrap}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...S.btn, borderColor: open ? COLOR.gold : 'rgba(212,175,55,0.25)' }}
        aria-label="Change language"
      >
        <span style={S.globe}>🌐</span>
        <span style={S.code}>{current.native}</span>
        <span style={{ ...S.arrow, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            style={S.dropdown}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div style={S.dropHeader}>SELECT LANGUAGE</div>
            <div style={S.scroll}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  style={{ ...S.item, ...(l.code === lang ? S.itemActive : {}) }}
                >
                  <span style={{ color: l.code === lang ? COLOR.gold : COLOR.textPrimary, fontSize: '0.78rem', fontFamily: FONT.body }}>
                    {l.native}
                  </span>
                  <span style={S.itemLabel}>{l.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const S = {
  wrap:       { position: 'relative', zIndex: 1900 },
  btn:        { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(10,8,14,0.88)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 20, backdropFilter: 'blur(20px)', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' },
  globe:      { fontSize: '0.75rem', opacity: 0.8 },
  code:       { fontFamily: FONT.body, fontSize: '0.72rem', color: COLOR.textPrimary, fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  arrow:      { fontSize: '0.6rem', color: COLOR.goldDim, transition: 'transform 0.2s ease' },
  dropdown:   { position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 170, background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', backdropFilter: 'blur(24px)' },
  dropHeader: { padding: '0.5rem 0.75rem', fontFamily: FONT.mono, fontSize: '0.36rem', letterSpacing: '0.18em', color: COLOR.textGhost, borderBottom: '1px solid rgba(212,175,55,0.08)' },
  scroll:     { maxHeight: 260, overflowY: 'auto', padding: '0.3rem' },
  item:       { display: 'flex', flexDirection: 'column', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', marginBottom: 2 },
  itemActive: { background: 'rgba(212,175,55,0.08)', borderLeft: `2px solid #D4AF37` },
  itemLabel:  { fontFamily: FONT.mono, fontSize: '0.36rem', letterSpacing: '0.08em', color: COLOR.textGhost, marginTop: '0.15rem', textTransform: 'uppercase' },
};