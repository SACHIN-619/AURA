// LanguageSelector — small dropdown, fixed top-right, never blocks content.
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT } from '../utils/tokens';

export default function LanguageSelector() {
  const { lang, setLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = languages.find(l => l.code === lang) || languages[0];

  return (
    <div ref={ref} className="lang-wrap" style={S.wrap}>
      <button onClick={() => setOpen(o => !o)} style={S.btn} aria-label="Change language">
        <span style={S.flag}>🌐</span>
        <span style={S.code}>{current.native}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div style={S.dropdown} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                style={{ ...S.item, ...(l.code === lang ? S.itemActive : {}) }}>
                <span>{l.native}</span>
                <span style={S.itemLabel}>{l.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const S = {
  wrap:     { position: 'fixed', top: '1rem', right: '1rem', zIndex: 700 },
  btn:      { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 20, backdropFilter: 'blur(16px)', cursor: 'pointer' },
  flag:     { fontSize: '0.75rem' },
  code:     { fontFamily: FONT.body, fontSize: '0.72rem', color: COLOR.textPrimary },
  dropdown: { position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 140, background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' },
  item:     { display: 'flex', flexDirection: 'column', width: '100%', padding: '0.55rem 0.8rem', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left' },
  itemActive: { background: 'rgba(212,175,55,0.08)' },
  itemLabel: { fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.08em', color: COLOR.textGhost, marginTop: '0.1rem' },
};
