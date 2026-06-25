// client/components/GlassSidebar.jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLOR, FONT, CATEGORY_FILTERS, GENDER_FILTERS } from '../utils/tokens';
import DynamicTranslate from './DynamicTranslate';

const PET_COORD_NUMBER = import.meta.env.VITE_CONCIERGE_NUMBER || '+91 90000 00000';

export default function GlassSidebar({ collapsed, setCollapsed }) {
  const {
    allHubs,
    activeHub,
    activeFilters,
    toggleFilter,
    clearFilters,
    genderFilter, setGenderFilter,
    syncHub,
    appendHub,
    loading,
    trackEvent,
    pushToast,
  } = useAura();

  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [newSuburb, setNewSuburb] = useState('');
  const [searchingSuburb, setSearchingSuburb] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPetInfo, setShowPetInfo] = useState(false);

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

  // Search new suburb via Nominatim, add as dynamic hub
  const handleSuburbSearch = async (e) => {
    e.preventDefault();
    if (!newSuburb.trim() || searchingSuburb) return;
    setSearchingSuburb(true);
    try {
      const query = encodeURIComponent(`${newSuburb}, Hyderabad, Telangana, India`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=3`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        const name = place.address?.suburb || place.address?.neighbourhood || place.address?.city_district || newSuburb.trim();
        const newHub = {
          hub: name,
          count: 0,
          lat: parseFloat(place.lat) || 17.3850,
          lon: parseFloat(place.lon) || 78.4867,
        };
        appendHub(newHub);
        syncHub(name);
        trackEvent('new_area_interest', { area: name, query: newSuburb });
        pushToast(`✦ ${name} added! Syncing salons from the area…`, 'success');
        setNewSuburb('');
      } else {
        pushToast(`"${newSuburb}" not found in Hyderabad. Try a different spelling.`, 'warning');
      }
    } catch {
      pushToast('Area lookup failed. Check your connection.', 'error');
    } finally {
      setSearchingSuburb(false);
    }
  };

  // ── Collapsed (minimized) sidebar ─────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <aside className="sidebar-desktop" style={S.collapsedBar}>
          <button onClick={() => setCollapsed(false)} style={S.expandBtn} title="Expand sidebar">
            ☰
          </button>
          <div style={S.collapsedBrand}>A</div>
          <div style={S.collapsedDivider} />
          {/* Quick hub icons */}
          {hubNames.slice(0, 6).map(hub => {
            const isActive = activeHub === hub;
            return (
              <button
                key={hub}
                onClick={() => handleHubClick(hub)}
                style={{ ...S.collapsedHubBtn, ...(isActive ? { borderColor: COLOR.gold, color: COLOR.gold } : {}) }}
                title={hub}
              >
                {hub.charAt(0)}
              </button>
            );
          })}
        </aside>
        {/* Mobile hamburger */}
        <button id="hamburger" style={S.hamburger} onClick={() => { setCollapsed(false); setMobileOpen(true); }} aria-label="Toggle menu">☰</button>
      </>
    );
  }

  const sidebarContent = (
    <aside
      className={`sidebar-desktop ${mobileOpen ? 'mobile-open' : ''}`}
      style={{
        ...S.sidebar,
        ...(mobileOpen ? { transform: 'translateX(0)' } : {}),
      }}
    >
      {/* Minimize + Brand */}
      <div style={S.brandBlock}>
        <button onClick={() => setCollapsed(true)} style={S.minimizeBtn} title="Minimize sidebar">◀</button>
        <div style={S.logoText}>AURA</div>
        <div style={S.tagline}>{t('brand_tagline')}</div>
      </div>

      {/* Hub Selector */}
      <div style={S.section}>
        <div style={S.label}>{t('sidebar_find_hub')}</div>
        <input
          style={S.searchInp}
          placeholder={t('sidebar_search_areas') || 'Search areas…'}
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
                <DynamicTranslate text={hub} />
              </button>
            );
          })}
        </div>
      </div>

      {/* New Suburb Search */}
      <div style={S.section}>
        <div style={S.label}>🗺 Search New Area</div>
        <form onSubmit={handleSuburbSearch} style={{ display: 'flex', gap: '0.3rem' }}>
          <input
            style={{ ...S.searchInp, marginBottom: 0, flex: 1 }}
            placeholder="e.g. Miyapur, KPHB…"
            value={newSuburb}
            onChange={e => setNewSuburb(e.target.value)}
            disabled={searchingSuburb}
          />
          <button
            type="submit"
            disabled={searchingSuburb || !newSuburb.trim()}
            style={S.suburbSearchBtn}
            title="Find this area"
          >
            {searchingSuburb ? '⟳' : '→'}
          </button>
        </form>
        <p style={S.suburbNote}>
          Unknown area? We'll verify and notify admin to expand coverage.
        </p>
      </div>

      {/* Category Filter — multi-select */}
      <div style={S.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={S.label}>{t('sidebar_filter_category')}</div>
          {activeFilters.size > 0 && (
            <button onClick={clearFilters} style={S.clearBtn}>Clear ({activeFilters.size})</button>
          )}
        </div>
        <div style={S.filterGrid}>
          <button
            onClick={clearFilters}
            style={{ ...S.filterBtn, ...(activeFilters.size === 0 ? S.filterBtnActive : {}) }}
          >
            All Services
          </button>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.tag}
              onClick={() => toggleFilter(f.tag)}
              style={{
                ...S.filterBtn,
                ...(activeFilters.has(f.tag) ? S.filterBtnActive : {}),
              }}
            >
              <DynamicTranslate text={f.label} />
              {activeFilters.has(f.tag) && <span style={S.checkMark}> ✓</span>}
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

      {/* Animal Grooming Toggle */}
      <div style={S.section}>
        <button
          onClick={() => setShowPetInfo(v => !v)}
          style={{ ...S.genderBtn, ...(showPetInfo ? S.genderBtnActive : {}), textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🐾 Animal Grooming
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{showPetInfo ? '▲' : '▼'}</span>
        </button>
        <AnimatePresence>
          {showPetInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={S.petInfoBox}
            >
              <p style={S.petInfoText}>
                🐾 <strong>Pet Grooming (Phase 2)</strong><br />
                Special Care Support Coordinator:<br />
                <a href={`tel:${PET_COORD_NUMBER.replace(/\s/g,'')}`} style={{ color: COLOR.gold }}>{PET_COORD_NUMBER}</a>
              </p>
              <p style={S.petNote}>
                Human grooming focus for now. Pet services launching Phase 2.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
  // Collapsed sidebar
  collapsedBar: {
    width: 50,
    background: 'rgba(10,8,14,0.97)',
    borderRight: '1px solid rgba(212,175,55,0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.6rem 0',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 800,
    boxSizing: 'border-box',
    gap: '0.4rem',
  },
  expandBtn: {
    width: 32, height: 32, borderRadius: 6,
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)',
    color: COLOR.gold, fontSize: '0.85rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  collapsedBrand: {
    fontFamily: FONT.display, fontSize: '1.1rem', color: COLOR.gold, fontWeight: 300,
    marginTop: '0.2rem', marginBottom: '0.3rem',
  },
  collapsedDivider: {
    width: 24, height: 1, background: 'rgba(212,175,55,0.15)', margin: '0.2rem 0',
  },
  collapsedHubBtn: {
    width: 30, height: 30, borderRadius: 6,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    color: COLOR.textGhost, fontFamily: FONT.mono, fontSize: '0.6rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  minimizeBtn: {
    position: 'absolute', top: '0.6rem', right: '0.5rem',
    width: 22, height: 22, borderRadius: 4,
    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
    color: COLOR.goldDim, fontSize: '0.55rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  brandBlock: { position: 'relative', textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(212,175,55,0.1)', paddingBottom: '0.8rem' },
  logoText:   { fontFamily: FONT.display, fontSize: '1.8rem', letterSpacing: '0.15em', color: COLOR.gold, fontWeight: 300 },
  tagline:    { fontFamily: FONT.mono, fontSize: '0.43rem', letterSpacing: '0.1em', color: COLOR.textGhost, marginTop: '0.2rem', textTransform: 'uppercase' },
  section:    { marginBottom: '1.2rem', display: 'flex', flexDirection: 'column' },
  label:      { fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.14em', color: COLOR.goldDim, marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 },
  searchInp:  { width: '100%', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: COLOR.textPrimary, fontFamily: FONT.body, fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.4rem' },
  hubScroll:  { maxHeight: 160, overflowY: 'auto', border: '1px solid rgba(212,175,55,0.05)', background: 'rgba(0,0,0,0.15)', borderRadius: 4, padding: '0.2rem' },
  hubEmpty:   { fontFamily: FONT.mono, fontSize: '0.44rem', color: COLOR.textGhost, textAlign: 'center', padding: '0.6rem' },
  hubItem:    { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.3rem 0.5rem', color: COLOR.textMuted, fontFamily: FONT.body, fontSize: '0.72rem', cursor: 'pointer', borderRadius: 3, transition: 'all 0.18s' },
  hubItemActive: { background: 'rgba(212,175,55,0.08)', color: COLOR.gold, fontWeight: 500 },
  suburbSearchBtn: { padding: '0.4rem 0.55rem', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 4, color: COLOR.gold, fontFamily: FONT.mono, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 },
  suburbNote: { fontFamily: FONT.mono, fontSize: '0.42rem', color: COLOR.textGhost, marginTop: '0.4rem', lineHeight: 1.4 },
  clearBtn:   { background: 'none', border: 'none', color: 'rgba(239,83,80,0.8)', fontFamily: FONT.mono, fontSize: '0.42rem', cursor: 'pointer', padding: 0 },
  filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' },
  filterBtn:  { padding: '0.4rem 0.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, color: COLOR.textMuted, fontFamily: FONT.body, fontSize: '0.64rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  filterBtnActive: { borderColor: COLOR.goldDim, color: COLOR.gold, background: 'rgba(212,175,55,0.08)' },
  checkMark:  { color: '#4CAF50', fontWeight: 700 },
  genderRow:  { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  genderBtn:  { width: '100%', padding: '0.35rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.62rem', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s' },
  genderBtnActive: { borderColor: COLOR.gold, color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  petInfoBox: { overflow: 'hidden', marginTop: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 6, padding: '0.6rem' },
  petInfoText:{ fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.textMuted, lineHeight: 1.6, margin: 0 },
  petNote:    { fontFamily: FONT.mono, fontSize: '0.42rem', color: COLOR.textGhost, marginTop: '0.4rem', lineHeight: 1.4 },
  hamburger:  { display: 'none', position: 'fixed', top: '0.8rem', left: '0.8rem', zIndex: 900, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', background: 'rgba(10,8,14,0.9)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, color: COLOR.gold, fontSize: '1rem', cursor: 'pointer' },
  backdrop:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 790, backdropFilter: 'blur(2px)' },
};