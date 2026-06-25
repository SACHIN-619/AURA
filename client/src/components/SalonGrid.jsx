import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { buildDemoSalons } from '../utils/demoData';
import { getSalonPhoto, estimatePriceTier, parseOpeningHours, COLOR, FONT } from '../utils/tokens';

export default function SalonGrid() {
  const { activeHub, activeCategory, genderFilter } = useAura();
  const { t } = useLanguage();
  const [salons, setSalons] = useState([]);

  useEffect(() => {
    // Generate intelligent dynamic items based directly on selected region parameter
    const activeNodes = buildDemoSalons(activeHub);
    
    // Apply granular frontend taxonomy tracking criteria safely
    const filtered = activeNodes.filter(s => {
      const matchCat = !activeCategory || s.serviceCategories.includes(activeCategory);
      const matchGen = !genderFilter || s.servesGender === 'unisex' || s.servesGender === genderFilter;
      return matchCat && matchGen;
    });

    setSalons(filtered);
  }, [activeHub, activeCategory, genderFilter]);

  if (salons.length === 0) {
    return (
      <div style={S.emptyBox}>
        <p style={S.emptyText}>No premium nodes found matching the chosen configuration criteria.</p>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {salons.map((salon, index) => {
        const photoUrl = getSalonPhoto(salon, index);
        const priceInfo = estimatePriceTier(salon);
        const hours = parseOpeningHours(salon.openingHours);

        return (
          <motion.div 
            key={salon._id} 
            style={S.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
            whileHover={{ y: -4, borderColor: 'rgba(212,175,55,0.45)' }}
          >
            <div style={S.imgContainer}>
              <img src={photoUrl} alt={salon.name} style={S.img} />
              <div style={S.genderBadge}>{salon.servesGender.toUpperCase()}</div>
              {hours.isOpen && <div style={S.liveIndicator}>LIVE NOW</div>}
            </div>

            <div style={S.body}>
              <h3 style={S.title}>{salon.name}</h3>
              <p style={S.address}>{salon.address.displayAddress}</p>

              <div style={S.metricsRow}>
                <div style={S.metric}>
                  <span style={S.goldText}>★ {salon.luxuryRating || '5.0'}</span>
                  <span style={S.subText}>({salon.reviewCount || '45'} Reviews)</span>
                </div>
                <div style={S.priceBadge} title={`Estimated range: ${priceInfo.range}`}>
                  {priceInfo.tier} · <span style={{ fontSize: '0.6rem' }}>{priceInfo.label}</span>
                </div>
              </div>

              <div style={S.tagsRow}>
                {salon.serviceCategories.map(cat => (
                  <span key={cat} style={S.tag}>✦ {cat.toUpperCase()}</span>
                ))}
              </div>

              <div style={S.hoursLine}>{hours.label}</div>

              <div style={S.actionContainer}>
                <a 
                  href={`https://wa.me/${salon.contact.whatsapp || '919848012345'}?text=Hello%20Aura,%20I'd%20like%20to%20request%20an%20appointment%20at%20${encodeURIComponent(salon.name)}`}
                  target="_blank" 
                  rel="noreferrer" 
                  style={S.primaryBtn}
                >
                  {t('booking_whatsapp_title')}
                </a>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const S = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  card: {
    background: 'rgba(18, 14, 24, 0.7)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.25s ease'
  },
  imgContainer: {
    position: 'relative',
    width: '100%',
    height: 170,
    background: '#050307',
    overflow: 'hidden'
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  genderBadge: {
    position: 'absolute',
    bottom: '0.6rem',
    left: '0.6rem',
    background: 'rgba(0, 0, 0, 0.75)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 4,
    padding: '0.2rem 0.4rem',
    fontFamily: FONT.mono,
    fontSize: '0.55rem',
    color: COLOR.gold,
    letterSpacing: '0.05em'
  },
  liveIndicator: {
    position: 'absolute',
    top: '0.6rem',
    right: '0.6rem',
    background: '#1b4d22',
    color: '#81c784',
    fontSize: '0.52rem',
    fontFamily: FONT.mono,
    padding: '0.2rem 0.5rem',
    borderRadius: 12,
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    boxShadow: '0 0 8px rgba(27,77,34,0.6)'
  },
  body: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  title: {
    fontFamily: FONT.display,
    fontSize: '1.2rem',
    fontWeight: 400,
    color: COLOR.textPrimary,
    margin: 0,
    lineHeight: 1.2
  },
  address: {
    fontFamily: FONT.body,
    fontSize: '0.75rem',
    color: COLOR.textMuted,
    margin: '0.3rem 0 0.8rem 0',
    lineHeight: 1.4
  },
  metricsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem'
  },
  metric: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontFamily: FONT.body,
    fontSize: '0.8rem'
  },
  goldText: {
    color: COLOR.gold,
    fontWeight: 'bold'
  },
  subText: {
    color: COLOR.textGhost,
    fontSize: '0.7rem'
  },
  priceBadge: {
    fontFamily: FONT.mono,
    fontSize: '0.7rem',
    color: COLOR.textPrimary,
    background: 'rgba(212,175,55,0.08)',
    padding: '0.15rem 0.4rem',
    borderRadius: 4,
    border: '1px solid rgba(212,175,55,0.15)'
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    marginBottom: '0.8rem'
  },
  tag: {
    fontFamily: FONT.mono,
    fontSize: '0.55rem',
    color: COLOR.goldDim,
    background: 'rgba(255,255,255,0.03)',
    padding: '0.15rem 0.35rem',
    borderRadius: 3
  },
  hoursLine: {
    fontFamily: FONT.mono,
    fontSize: '0.65rem',
    color: COLOR.textGhost,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '0.5rem',
    marginTop: 'auto',
    marginBottom: '0.6rem'
  },
  actionContainer: {
    width: '100%'
  },
  primaryBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #FFF2A8, #D4AF37)',
    border: 'none',
    borderRadius: 6,
    color: '#000',
    fontFamily: FONT.mono,
    fontSize: '0.7rem',
    fontWeight: 700,
    textDecoration: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    letterSpacing: '0.05em'
  },
  emptyBox: {
    padding: '4rem 2rem',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.01)',
    borderRadius: 8,
    border: '1px dashed rgba(212,175,55,0.15)'
  },
  emptyText: {
    fontFamily: FONT.mono,
    fontSize: '0.8rem',
    color: COLOR.textGhost
  }
};