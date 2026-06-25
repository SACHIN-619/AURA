// client/components/LanguageSelector.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useAura, API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const { allHubs } = useAura(); // Contains the current geographic hub context
  const [open, setOpen] = useState(false);
  const [dynamicLanguages, setDynamicLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const h = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // ZERO HARDCODING: Ask the AI Mesh what languages to show based on the current active hubs
  useEffect(() => {
    const fetchAiLocalizedLanguages = async () => {
      try {
        setLoading(true);
        // Pass current database hubs to the AI to compute the cultural footprint
        const currentHubs = allHubs.map(h => typeof h === 'object' ? h.hub : h).join(', ');
        
        const response = await fetch(`${API}/api/ai/localize-languages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contextHubs: currentHubs || 'Hyderabad' })
        });
        
        const resData = await response.json();
        if (resData.success && resData.languages) {
          setDynamicLanguages(resData.languages);
        }
      } catch (err) {
        console.error('AI language synthesis fallback triggered:', err);
        // Absolute emergency baseline fallback if AI network is down
        setDynamicLanguages([
          { code: 'en', native: 'English', label: 'GLOBAL' },
          { code: 'te', native: 'తెలుగు', label: 'LOCAL' },
          { code: 'hi', native: 'हिन्दी', label: 'NATIONAL' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAiLocalizedLanguages();
  }, [allHubs]);

  const current = dynamicLanguages.find(l => l.code === lang) || dynamicLanguages[0] || { native: 'English' };

  return (
    <div ref={ref} className="lang-wrap" style={S.wrap}>
      <button 
        onClick={() => setOpen(o => !o)} 
        style={{ ...S.btn, borderColor: open ? COLOR.gold : 'rgba(212, 175, 55, 0.25)' }} 
        aria-label="Change language"
        disabled={loading}
      >
        <span style={S.flag}>{loading ? '⟳' : '🌐'}</span>
        <span style={S.code}>{current.native}</span>
        <span style={{ ...S.arrow, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      
      <AnimatePresence>
        {open && !loading && (
          <motion.div 
            style={S.dropdown} 
            initial={{ opacity: 0, y: -8, scale: 0.97 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -4, scale: 0.97 }} 
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div style={S.dropdownScroll}>
              {dynamicLanguages.map(l => (
                <button 
                  key={l.code} 
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  style={{ ...S.item, ...(l.code === lang ? S.itemActive : {}) }}
                >
                  <span style={{ color: l.code === lang ? COLOR.gold : COLOR.textPrimary, fontSize: '0.72rem' }}>
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
  wrap:     { position: 'fixed', top: '1.2rem', right: '1.2rem', zIndex: 1900 },
  btn:      { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem', background: 'rgba(10, 8, 14, 0.85)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 20, backdropFilter: 'blur(20px)', cursor: pointer => 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  flag:     { fontSize: '0.75rem', opacity: 0.8 },
  code:     { fontFamily: FONT.body, fontSize: '0.72rem', color: COLOR.textPrimary, fontWeight: 500 },
  arrow:    { fontSize: '0.6rem', color: COLOR.goldDim, transition: 'transform 0.2s ease', marginLeft: '0.1rem' },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 160, background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', backdropFilter: 'blur(24px)' },
  dropdownScroll: { maxHeight: '240px', overflowY: 'auto', padding: '0.25rem' },
  item:     { display: 'flex', flexDirection: 'column', width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease', marginBottom: '2px' },
  itemActive: { background: 'rgba(212,175,55,0.08)', borderLeft: `2px solid #D4AF37` },
  itemLabel: { fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.08em', color: COLOR.textGhost, marginTop: '0.15rem', textTransform: 'uppercase' },
};