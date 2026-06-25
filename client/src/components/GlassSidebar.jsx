// client/components/GlassSidebar.jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLOR, FONT, CATEGORY_FILTERS, GENDER_FILTERS } from '../utils/tokens';

export default function GlassSidebar() {
  const {
    allHubs,
    activeHub,
    activeCategory, setActiveCategory,
    genderFilter,  setGenderFilter,
    syncHub,       // ← correct: triggers API fetch + state update
    loading,
  } = useAura();

  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Normalize: allHubs is [{hub, count, lat, lon}] or ['string', ...]
  const hubNames = allHubs
    .map(h => (typeof h === 'object' ? h.hub : h))
    .filter(h => typeof h === 'string' && h.length > 0);

  const filteredHubs = hubNames.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const handleHubClick = useCallback((hub) => {
    if (hub && hub !== activeHub) syncHub(hub);
    setMobileOpen(false);
  }, [syncHub, activeHub]);

  const sidebarContent = (
    <aside
      className="sidebar-desktop"
      style={{
        ...S.sidebar,
        ...(mobileOpen ? { transform: 'translateX(0)' } : {}),
      }}
    >
      {/* Brand */}
      <div style={S.brandBlock}>
        <div style={S.logoText}>AURA</div>
        <div style={S.tagline}>{t('brand_tagline')}</div>
      </div>

      {/* Hub Selector */}
      <div style={S.section}>
        <div style={S.label}>{t('sidebar_find_hub')}</div>
        <input
          style={S.searchInp}
          placeholder={t('sidebar_search_areas')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={S.hubScroll}>
          {filteredHubs.length === 0 && (
            <p style={S.hubEmpty}>Loading hubs…</p>
          )}
          {filteredHubs.map(hub => {
            const isActive = activeHub === hub;
            return (
              <button
                key={hub}
                onClick={() => handleHubClick(hub)}
                disabled={loading}
                style={{ ...S.hubItem, ...(isActive ? S.hubItemActive : {}) }}
              >
                <span style={{ color: isActive ? COLOR.gold : 'inherit', marginRight: 4 }}>✦</span>
                {hub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div style={S.section}>
        <div style={S.label}>{t('sidebar_filter_category')}</div>
        <div style={S.filterGrid}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{ ...S.filterBtn, ...(!activeCategory ? S.filterBtnActive : {}) }}
          >
            All Services
          </button>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.tag}
              onClick={() => setActiveCategory(f.tag)}
              style={{ ...S.filterBtn, ...(activeCategory === f.tag ? S.filterBtnActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gender Filter */}
      <div style={S.section}>
        <div style={S.label}>{t('sidebar_serves')}</div>
        <div style={S.genderRow}>
          {GENDER_FILTERS.map(f => {
            const isActive = genderFilter === f.value || (f.value === 'any' && (!genderFilter || genderFilter === 'any'));
            return (
              <button
                key={f.value}
                onClick={() => setGenderFilter(f.value === 'any' ? 'any' : f.value)}
                style={{ ...S.genderBtn, ...(isActive ? S.genderBtnActive : {}) }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Hamburger — only visible on mobile via CSS */}
      <button
        id="hamburger"
        style={S.hamburger}
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            style={S.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {sidebarContent}
    </>
  );
}

const S = {
  sidebar: {
    width: 240,
    background: 'rgba(10,8,14,0.97)',
    borderRight: '1px solid rgba(212,175,55,0.15)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.2rem 1rem',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 800,
    boxSizing: 'border-box',
    overflowY: 'auto',
    transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
  },
  brandBlock: { textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(212,175,55,0.1)', paddingBottom: '0.8rem' },
  logoText:   { fontFamily: FONT.display, fontSize: '1.8rem', letterSpacing: '0.15em', color: COLOR.gold, fontWeight: 300 },
  tagline:    { fontFamily: FONT.mono, fontSize: '0.43rem', letterSpacing: '0.1em', color: COLOR.textGhost, marginTop: '0.2rem', textTransform: 'uppercase' },
  section:    { marginBottom: '1.2rem', display: 'flex', flexDirection: 'column' },
  label:      { fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.14em', color: COLOR.goldDim, marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 },
  searchInp:  { width: '100%', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: COLOR.textPrimary, fontFamily: FONT.body, fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.4rem' },
  hubScroll:  { maxHeight: 160, overflowY: 'auto', border: '1px solid rgba(212,175,55,0.05)', background: 'rgba(0,0,0,0.15)', borderRadius: 4, padding: '0.2rem' },
  hubEmpty:   { fontFamily: FONT.mono, fontSize: '0.44rem', color: COLOR.textGhost, textAlign: 'center', padding: '0.6rem' },
  hubItem:    { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.3rem 0.5rem', color: COLOR.textMuted, fontFamily: FONT.body, fontSize: '0.72rem', cursor: 'pointer', borderRadius: 3, transition: 'all 0.18s' },
  hubItemActive: { background: 'rgba(212,175,55,0.08)', color: COLOR.gold, fontWeight: 500 },
  filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' },
  filterBtn:  { padding: '0.4rem 0.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, color: COLOR.textMuted, fontFamily: FONT.body, fontSize: '0.64rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  filterBtnActive: { borderColor: COLOR.goldDim, color: COLOR.gold, background: 'rgba(212,175,55,0.05)' },
  genderRow:  { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  genderBtn:  { width: '100%', padding: '0.35rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.62rem', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s' },
  genderBtnActive: { borderColor: COLOR.gold, color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  hamburger:  { display: 'none', position: 'fixed', top: '0.8rem', left: '0.8rem', zIndex: 900, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', background: 'rgba(10,8,14,0.9)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, color: COLOR.gold, fontSize: '1rem', cursor: 'pointer' },
  backdrop:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 790, backdropFilter: 'blur(2px)' },
};