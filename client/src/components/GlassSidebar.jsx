// client/components/GlassSidebar.jsx
import { useState } from 'react';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLOR, FONT, CATEGORY_FILTERS, GENDER_FILTERS } from '../utils/tokens';

export default function GlassSidebar() {
  const { 
    allHubs, // ZERO-HARDCODING: Stream live hub elements straight out of AuraContext state tracking
    activeHub, 
    setActiveHub, 
    activeCategory, 
    setActiveCategory, 
    genderFilter, 
    setGenderFilter 
  } = useAura();
  
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  // Normalize mapping safely whether allHubs is an array of plain strings or object schemas [{hub: "..."}]
  const normalizedHubList = allHubs.map(h => typeof h === 'object' ? h.hub : h);

  const filteredHubs = normalizedHubList.filter(hubName => 
    hubName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside style={S.sidebar}>
      <div style={S.brandBlock}>
        <div style={S.logoText}>AURA</div>
        <div style={S.tagline}>{t('brand_tagline')}</div>
      </div>

      <div style={S.section}>
        <div style={S.label}>{t('sidebar_find_hub')}</div>
        <input 
          style={S.searchInp} 
          placeholder={t('sidebar_search_areas')} 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={S.hubScroll}>
          {filteredHubs.map(hub => {
            const isSelected = activeHub === hub;
            return (
              <button
                key={hub}
                onClick={() => setActiveHub(hub)}
                style={{ ...S.hubItem, ...(isSelected ? S.hubItemActive : {}) }}
              >
                <span style={{ color: isSelected ? COLOR.gold : 'inherit' }}>✦</span> {hub}
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.label}>{t('sidebar_filter_category')}</div>
        <div style={S.filterGrid}>
          <button 
            onClick={() => setActiveCategory(null)}
            style={{ ...S.filterBtn, ...(!activeCategory ? S.filterBtnActive : {}) }}
          >
            All Services
          </button>
          {CATEGORY_FILTERS.map(f => {
            const isSelected = activeCategory === f.tag;
            return (
              <button
                key={f.tag}
                onClick={() => setActiveCategory(f.tag)}
                style={{ ...S.filterBtn, ...(isSelected ? S.filterBtnActive : {}) }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.label}>{t('sidebar_serves')}</div>
        <div style={S.genderRow}>
          {GENDER_FILTERS.map(f => {
            const isSelected = (genderFilter === f.value) || (f.value === 'any' && !genderFilter);
            return (
              <button
                key={f.value}
                onClick={() => setGenderFilter(f.value === 'any' ? null : f.value)}
                style={{ ...S.genderBtn, ...(isSelected ? S.genderBtnActive : {}) }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ... styles object (S) remains exactly unchanged below

const S = {
  sidebar: {
    width: 240,
    background: 'rgba(10, 8, 14, 0.96)',
    borderRight: '1px solid rgba(212, 175, 55, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.2rem 1rem',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 800,
    boxSizing: 'border-box',
    overflowY: 'auto'
  },
  brandBlock: {
    textAlign: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
    paddingBottom: '0.8rem'
  },
  logoText: {
    fontFamily: FONT.display,
    fontSize: '1.8rem',
    letterSpacing: '0.15em',
    color: COLOR.gold,
    fontWeight: 300
  },
  tagline: {
    fontFamily: FONT.mono,
    fontSize: '0.45rem',
    letterSpacing: '0.1em',
    color: COLOR.textGhost,
    marginTop: '0.2rem',
    textTransform: 'uppercase'
  },
  section: {
    marginBottom: '1.2rem',
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: '0.52rem',
    letterSpacing: '0.14em',
    color: COLOR.goldDim,
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    fontWeight: 600
  },
  searchInp: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: COLOR.textPrimary,
    fontFamily: FONT.body,
    fontSize: '0.75rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '0.4rem'
  },
  hubScroll: {
    maxHeight: '140px',
    overflowY: 'auto',
    border: '1px solid rgba(212,175,55,0.05)',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 4,
    padding: '0.2rem'
  },
  hubItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '0.3rem 0.5rem',
    color: COLOR.textMuted,
    fontFamily: FONT.body,
    fontSize: '0.72rem',
    cursor: 'pointer',
    borderRadius: 3,
    transition: 'all 0.2s'
  },
  hubItemActive: {
    background: 'rgba(212, 175, 55, 0.08)',
    color: COLOR.gold,
    fontWeight: 500
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.3rem'
  },
  filterBtn: {
    padding: '0.4rem 0.2rem',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 4,
    color: COLOR.textMuted,
    fontFamily: FONT.body,
    fontSize: '0.68rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  filterBtnActive: {
    borderColor: COLOR.goldDim,
    color: COLOR.gold,
    background: 'rgba(212,175,55,0.05)'
  },
  genderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem'
  },
  genderBtn: {
    width: '100%',
    padding: '0.35rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.05)',
    color: COLOR.textMuted,
    fontFamily: FONT.mono,
    fontSize: '0.65rem',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  genderBtnActive: {
    borderColor: COLOR.gold,
    color: COLOR.gold,
    background: 'rgba(212,175,55,0.06)'
  }
};