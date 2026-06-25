// client/components/SalonCard.jsx
import { useState, forwardRef, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { safeAddress, safeCoords } from '../context/AuraContext';
import { getSalonPhoto, parseOpeningHours, CATEGORY_LABELS, COLOR, FONT, SPRING } from '../utils/tokens';
import { PinIcon, PhoneIcon, GlobeIcon, RouteIcon, MessageIcon } from './icons.jsx';
import BookingModal from './BookingModal';
import RatingDisplay from './RatingDisplay';
import BookingSuccess from './BookingSuccess';
import VerifiedListingBadge from './VerifiedListingBadge';
import DynamicTranslate from './DynamicTranslate';

export const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING.default },
};

function hav(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Claim Listing Modal ───────────────────────────────────────────────────────
function ClaimModal({ salon, onClose, onClaim }) {
  return (
    <motion.div
      style={SM.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={SM.box}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={SM.icon}>🏪</div>
        <h3 style={SM.title}>Claim This Listing</h3>
        <p style={SM.body}>
          Are you the owner of <strong style={{ color: COLOR.gold }}>{salon.name}</strong>?
          Claim this listing to unlock full control:
        </p>
        <ul style={SM.list}>
          <li>✦ Edit business details, images &amp; pricing</li>
          <li>✦ Respond to customer reviews</li>
          <li>✦ Set service categories &amp; availability</li>
          <li>✦ Receive a <strong>Verified Badge</strong> upon review</li>
        </ul>
        <p style={SM.note}>
          Our team will verify ownership and grant you shop authority within 24–48 hours.
        </p>
        <div style={SM.actions}>
          <button style={SM.cancelBtn} onClick={onClose}>Cancel</button>
          <motion.button
            style={SM.claimBtn}
            whileHover={{ filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onClaim}
          >
            ✦ Submit Claim Request
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Schedule Haircut Login Prompt ─────────────────────────────────────────────
function ScheduleLoginPrompt({ onClose, onLogin }) {
  return (
    <motion.div
      style={SM.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={{ ...SM.box, maxWidth: 360 }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={SM.icon}>✂️</div>
        <h3 style={SM.title}>Schedule Your Haircut</h3>
        <p style={SM.body}>
          Create a free account to book appointments, set reminders, and get exclusive AURA member pricing.
        </p>
        <div style={SM.actions}>
          <button style={SM.cancelBtn} onClick={onClose}>Maybe later</button>
          <motion.button
            style={SM.claimBtn}
            whileHover={{ filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onLogin}
          >
            Log in / Sign up
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const SalonCard = forwardRef(function SalonCard({ 
  salon, 
  idx = 0, 
  isMatch = false, 
  isOwnerContext = false, 
  onEditClick 
}, ref) {
  const { userLocation, trackEvent, pushToast, user, setAuthModalOpen } = useAura();
  const { t } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);
  const [hov, setHov] = useState(false);
  const [rx, setRx] = useState(0); 
  const [ry, setRy] = useState(0);
  const [showBook, setShowBook] = useState(false);
  const [showOk, setShowOk] = useState(false);
  const [okData, setOkData] = useState(null);
  
  // Smart AI Mesh, Claim, & Safety States
  const [aiAnalysis, setAiAnalysis] = useState(salon.aiResearchData || null);
  const [fetchingAi, setFetchingAi] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(false);
  const [showMapEmbed, setShowMapEmbed] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const claimTimerRef = useRef(null);

  useEffect(() => {
    if (!salon._isDemo && salon._id) {
      trackEvent('view', { salonId: salon._id, hub: salon.hub });
    }
    return () => {
      if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
    };
  }, []); // eslint-disable-line

  const name = typeof salon.name === 'string' ? salon.name : 'Unnamed Boutique';
  const hub = typeof salon.hub === 'string' ? salon.hub : '';
  const addr = safeAddress(salon);
  const coords = safeCoords(salon);
  const hours = parseOpeningHours(typeof salon.openingHours === 'string' ? salon.openingHours : '');
  const categories = Array.isArray(salon.serviceCategories) ? salon.serviceCategories : [];
  const gender = typeof salon.servesGender === 'string' ? salon.servesGender : null;
  const hasPhone = !!salon?.contact?.phone;
  const hasWeb = !!salon?.contact?.website;

  let distLabel = null;
  if (userLocation && coords) {
    const km = hav(userLocation.lat, userLocation.lon, coords.lat, coords.lon);
    distLabel = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  const mapsUrl = coords 
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}` 
    : `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + hub)}`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRx(-((e.clientY - r.top - r.height / 2) / (r.height / 2)) * 4);
    setRy(((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 4);
  };
  
  const onLeave = () => { setRx(0); setRy(0); setHov(false); };

  // AI Insights Generation 
  const triggerAiEnrichment = async () => {
    if (aiAnalysis || fetchingAi) return;
    setFetchingAi(true);
    try {
      const res = await fetch(`${API}/api/ai/enrich-salon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon._id, name, hub })
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.enriched);
        pushToast('Premium details generated via AI context mesh.', 'success');
      }
    } catch {
      pushToast('AI synthesis context timeout.', 'error');
    } finally {
      setFetchingAi(false);
    }
  };

  // Submit claim to backend
  const handleClaimShop = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch(`${API}/api/salons/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon._id })
      });
      const data = await res.json();
      if (data.success) {
        pushToast('Claim submitted! Our team will verify and grant shop authority within 24–48 hours.', 'info');
      } else {
        pushToast(data.message || 'Claim submission failed.', 'error');
      }
    } catch {
      pushToast('Failed initializing verification chain.', 'error');
    } finally {
      setIsClaiming(false);
      setShowClaimModal(false);
    }
  };

  // Schedule haircut — prompt login if guest
  const handleSchedule = () => {
    if (user) {
      setShowBook(true);
    } else {
      setShowSchedulePrompt(true);
    }
  };

  return (
    <>
      <motion.article 
        ref={ref} 
        variants={cardVariants}
        style={{
          ...S.card,
          border: `1px solid ${isMatch ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.16)'}`,
          boxShadow: hov ? '0 16px 44px rgba(0,0,0,0.5)' : isMatch ? '0 0 28px rgba(212,175,55,0.16)' : '0 4px 16px rgba(0,0,0,0.2)',
          transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${hov ? 6 : 0}px)`,
        }}
        onMouseMove={onMove} 
        onMouseLeave={onLeave}
      >
        {/* Photo Container */}
        <div style={S.photoWrap}>
          {!imgFailed ? (
            <img 
              src={getSalonPhoto(salon, idx)} 
              alt={name} 
              loading="lazy" 
              onError={() => setImgFailed(true)} 
              style={{...S.photo, transform: hov ? 'scale(1.04)' : 'scale(1)', filter: hov ? 'brightness(0.9)' : 'brightness(0.8)'}}
            />
          ) : (
            <div style={S.fallback}>
              <svg viewBox="0 0 120 80" fill="none" style={{width: 52, opacity: 0.3}}><rect x="10" y="25" width="100" height="45" rx="4" stroke="#D4AF37" strokeWidth="1.4"/><circle cx="35" cy="47" r="11" stroke="#D4AF37" strokeWidth="1.1"/><circle cx="85" cy="47" r="11" stroke="#D4AF37" strokeWidth="1.1"/></svg>
            </div>
          )}
          <div style={S.fade}/>

          {categories.length > 0 && (
            <span style={S.categoryChip}>
              <DynamicTranslate text={(CATEGORY_LABELS[categories[0]] || categories[0]).toUpperCase()} />
            </span>
          )}

          {isMatch && <div style={S.aiBadge}>✦ AI MATCH</div>}
          
          {/* Claim badge / Verified badge / Owner edit */}
          {isOwnerContext ? (
            <button 
              style={S.editIconBadge} 
              onClick={(e) => { e.stopPropagation(); onEditClick?.(salon); }}
              title="Launch profile configuration parameters"
            >
              ✏️
            </button>
          ) : (
            <div style={S.claimBadgeCluster}>
              {salon.listingVerified && (
                <div style={{ ...S.claimIconBadge, borderColor: COLOR.gold, cursor: 'default' }} title="Verified Listing">
                  ✦
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Data Canvas */}
        <div style={{ ...S.body, isolation: 'isolate' }}>
          <div style={S.nameRow}>
            {/* Salon name is NEVER translated — brand identity is preserved */}
            <h2 style={S.name}>{name}</h2>
            {salon.listingVerified && <VerifiedListingBadge size={14} />}
          </div>

          {addr && (
            <div style={S.metaRow}>
              <PinIcon size={11} />
              {/* Address parts are translated; name itself stays */}
              <span style={S.metaText}>
                <DynamicTranslate text={addr} />
              </span>
              {distLabel && (
                <span style={S.distPill}>
                  <DynamicTranslate text={distLabel} />
                </span>
              )}
            </div>
          )}

          <div style={{ ...S.statusRow, color: hours.isOpen === true ? '#4CAF50' : hours.isOpen === false ? '#EF5350' : COLOR.textGhost }}>
            <span style={S.statusDot} />
            <span style={S.statusText}>{hours.label}</span>
          </div>

          <div style={S.ratingWrap}>
            <RatingDisplay salon={salon} />
          </div>

          {/* AI Insights Segment */}
          <div style={S.aiDrawerContainer}>
            {aiAnalysis ? (
              <div style={S.aiInsightBody}>
                <p style={S.aiInsightText}>💡 <strong>AI Summary:</strong> {aiAnalysis.summary}</p>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'8px'}}>
                  <span style={S.aiPricePill}>Est. Entry Price: {aiAnalysis.estimatedBasePrice || "₹500+"}</span>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('openAuraChat', { detail: { query: `Tell me more about ${name} in ${hub}` } }))}
                    style={{...S.aiEnrichBtn, padding: '4px 10px', width: 'auto', fontSize: '0.65rem', margin: 0, height: 'auto'}}
                    title="Ask AI Concierge for follow-up details"
                  >
                    💬 Ask AI
                  </button>
                </div>
              </div>
            ) : (
              <motion.button 
                onClick={triggerAiEnrichment} 
                style={S.aiEnrichBtn} 
                disabled={fetchingAi}
                animate={{ scale: [1, 1.01, 1], boxShadow: ["0 0 5px rgba(212,175,55,0.1)", "0 0 15px rgba(212,175,55,0.5)", "0 0 5px rgba(212,175,55,0.1)"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                whileHover={{ filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.98 }}
              >
                {fetchingAi ? 'Synthesizing live profiles... ⟳' : '✦ Tap to parse live AI insights & pricing'}
              </motion.button>
            )}
          </div>

          <div style={S.tags}>
            {categories.length ? (
              categories.slice(0, 3).map(cat => (
                <span key={cat} style={S.tag}>
                  <DynamicTranslate text={CATEGORY_LABELS[cat] || cat} />
                </span>
              ))
            ) : (
              <span style={S.tagMuted}>{t('card_category_unlisted')}</span>
            )}
            {gender && <span style={S.tagGender}>{gender}</span>}
          </div>

          <div style={S.divider} />

          {/* Contact Row Fallback Mechanics */}
          <div style={S.contactRow}>
            {hasPhone ? (
              <a href={`tel:${salon.contact.phone}`} style={S.contactItem}><PhoneIcon size={11} color={COLOR.gold} /></a>
            ) : (
              <span style={{ ...S.contactItem, opacity: 0.3 }} title="Contact unlisted"><PhoneIcon size={11} color={COLOR.textGhost} /></span>
            )}
            {hasWeb ? (
              <a href={salon.contact.website} target="_blank" rel="noreferrer" style={S.contactItem}><GlobeIcon size={11} color={COLOR.gold} /></a>
            ) : (
              <span style={{ ...S.contactItem, opacity: 0.3 }} title="Website unlisted"><GlobeIcon size={11} color={COLOR.textGhost} /></span>
            )}
            <span style={S.priceNote}>Prices adjust dynamically</span>
          </div>

          {/* Action Arrays */}
          <div style={S.actions}>
            {isOwnerContext ? (
              <motion.button 
                style={S.dashboardBtn}
                whileHover={{ filter: 'brightness(1.08)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/owner/dashboard/services'}
              >
                ⚙️ Tune Allocation & Menu Matrices
              </motion.button>
            ) : (
              <>
                {/* Schedule Haircut — guest gets login prompt */}
                <motion.button
                  style={S.scheduleBtn}
                  onClick={handleSchedule}
                  whileHover={{ filter: 'brightness(1.08)' }}
                  whileTap={{ scale: 0.97 }}
                  title="Schedule your haircut appointment"
                >
                  ✂️ <span>{t('card_schedule') || 'Schedule'}</span>
                </motion.button>

                <motion.button 
                  style={S.primaryBtn} 
                  onClick={() => setShowBook(true)}
                  whileHover={{ filter: 'brightness(1.08)' }} 
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageIcon size={12} color="#1a1410" />
                  <span>{t('card_contact') || 'Contact'}</span>
                </motion.button>
                
                <motion.button 
                  style={S.iconBtn} 
                  onClick={() => {
                    trackEvent('route_click', { salonId: salon._id, hub: salon.hub });
                    setShowMapEmbed(true);
                  }} 
                  title={t('card_route')}
                  whileHover={{ borderColor: 'rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.04)' }} 
                  whileTap={{ scale: 0.94 }}
                >
                  <RouteIcon size={13} />
                </motion.button>

                <div style={{position:'relative'}}>
                  <motion.button 
                    style={S.iconBtn} 
                    onClick={() => setShowActionMenu(!showActionMenu)} 
                    title="More actions"
                    whileHover={{ borderColor: 'rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.04)' }} 
                    whileTap={{ scale: 0.94 }}
                  >
                    <span style={{fontSize: '1rem', lineHeight: '10px', marginTop: '-4px'}}>⋮</span>
                  </motion.button>
                  <AnimatePresence>
                    {showActionMenu && (
                      <motion.div 
                        initial={{opacity:0, y:5, scale:0.95}} 
                        animate={{opacity:1, y:0, scale:1}} 
                        exit={{opacity:0, y:5, scale:0.95}} 
                        style={{position:'absolute', bottom:'120%', right:0, background:'rgba(13,10,19,0.98)', border:'1px solid rgba(212,175,55,0.3)', borderRadius:'8px', padding:'4px', zIndex:100, minWidth:'130px', display:'flex', flexDirection:'column', gap:'2px', boxShadow:'0 8px 24px rgba(0,0,0,0.8)'}}
                      >
                        {!salon.listingVerified && (
                          <button 
                            style={{ background:'transparent', border:'none', color:'rgba(255,248,220,0.9)', padding:'8px 12px', textAlign:'left', fontSize:'0.75rem', fontFamily:FONT.mono, cursor:'pointer', width:'100%', borderRadius:'4px' }} 
                            onClick={(e) => { 
                              e.stopPropagation();
                              setShowActionMenu(false); 
                              if(!user) { pushToast('Please log in to claim this listing.', 'warning'); setAuthModalOpen?.(true); return; } 
                              setShowClaimModal(true); 
                            }}
                            onMouseOver={(e)=>e.currentTarget.style.background='rgba(212,175,55,0.1)'}
                            onMouseOut={(e)=>e.currentTarget.style.background='transparent'}
                          >
                            Claim Shop
                          </button>
                        )}
                        <button 
                          style={{ background:'transparent', border:'none', color:'#ef4444', padding:'8px 12px', textAlign:'left', fontSize:'0.75rem', fontFamily:FONT.mono, cursor:'pointer', width:'100%', borderRadius:'4px' }} 
                          onClick={async (e) => {
                            e.stopPropagation();
                            setShowActionMenu(false);
                            if (!user) return setAuthModalOpen(true);
                            if (window.confirm("Report this salon for inappropriate content or invalid details?")) {
                              try {
                                const res = await fetch(`${API}/api/salons/${salon._id}/report`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ user: user._id, reason: 'User Report', details: 'Reported via Salon Card' })
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert('Report submitted successfully. Thank you.');
                                } else {
                                  alert(data.error || 'Failed to submit report');
                                }
                              } catch (err) {
                                alert('Error submitting report.');
                              }
                            }
                          }}
                          onMouseOver={(e)=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
                          onMouseOut={(e)=>e.currentTarget.style.background='transparent'}
                        >
                          Report Shop
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.article>

      {/* Modals */}
      <AnimatePresence>
        {showBook && <BookingModal key="bm" salon={salon} onClose={() => setShowBook(false)} onSuccess={d => { setOkData(d); setShowOk(true); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showOk && okData && <BookingSuccess key="bs" salonName={okData.salonName} hub={okData.hub} bookingDate={okData.date} bookingSlot={okData.slot} userLocation={userLocation} salonCoords={coords} viaWhatsApp={okData.viaWhatsApp} onClose={() => setShowOk(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showClaimModal && (
          <ClaimModal
            key="claim"
            salon={salon}
            onClose={() => setShowClaimModal(false)}
            onClaim={handleClaimShop}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSchedulePrompt && (
          <ScheduleLoginPrompt
            key="sched"
            onClose={() => setShowSchedulePrompt(false)}
            onLogin={() => { setShowSchedulePrompt(false); setAuthModalOpen?.(true); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMapEmbed && (
          <MapEmbedModal
            key="map"
            salonName={name}
            mapsUrl={mapsUrl}
            coords={coords}
            onClose={() => setShowMapEmbed(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default SalonCard;

// ── Map Embed Modal ───────────────────────────────────────────────────────────
function MapEmbedModal({ salonName, mapsUrl, coords, onClose }) {
  const [mode, setMode] = useState('driving');
  
  const embedSrc = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(salonName)}&output=embed`;

  // Determine external URL with directions mode if coords are available
  const externalUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}&travelmode=${mode}`
    : mapsUrl;

  return (
    <motion.div
      style={SM.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={SM.mapBox}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={SM.mapHeader}>
          <h3 style={{ ...SM.title, marginBottom: 0, textAlign: 'left', flex: 1 }}>📍 Route to {salonName}</h3>
          <select 
            value={mode} 
            onChange={e => setMode(e.target.value)}
            style={{ marginRight: '0.8rem', background: 'rgba(212,175,55,0.1)', color: COLOR.gold, border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontFamily: FONT.mono, fontSize: '0.6rem', outline: 'none' }}
          >
            <option value="driving">🚗 Car</option>
            <option value="walking">🚶 Walk</option>
            <option value="bicycling">🚲 Bike</option>
            <option value="transit">🚌 Transit</option>
          </select>
          <button onClick={onClose} style={SM.cancelBtn}>✕</button>
        </div>
        <iframe
          src={embedSrc}
          style={SM.mapIframe}
          title={`Map to ${salonName}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div style={{ ...SM.actions, padding: '0.6rem 1rem' }}>
          <button style={SM.cancelBtn} onClick={onClose}>Close</button>
          <motion.button
            style={SM.claimBtn}
            whileHover={{ filter: 'brightness(1.1)' }}
            onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
          >
            🗺 Navigate on Google Maps
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Shared Modal Styles ───────────────────────────────────────────────────────
const SM = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5vh' },
  box:       { background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' },
  icon:      { fontSize: '2rem', textAlign: 'center', marginBottom: '0.8rem' },
  title:     { fontFamily: FONT.display, fontSize: '1.3rem', fontWeight: 500, color: COLOR.textPrimary, textAlign: 'center', marginBottom: '0.75rem' },
  body:      { fontFamily: FONT.body, fontSize: '0.84rem', color: COLOR.textMuted, lineHeight: 1.6, marginBottom: '0.8rem' },
  list:      { listStyle: 'none', padding: 0, margin: '0 0 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  note:      { fontFamily: FONT.mono, fontSize: '0.52rem', color: COLOR.textGhost, letterSpacing: '0.04em', marginBottom: '1.2rem', lineHeight: 1.5 },
  actions:   { display: 'flex', gap: '0.6rem' },
  cancelBtn: { flex: 1, padding: '0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: COLOR.textMuted, fontFamily: FONT.body, fontSize: '0.78rem', cursor: 'pointer' },
  claimBtn:  { flex: 2, padding: '0.6rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 8, color: '#1a1410', fontFamily: FONT.body, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' },
  mapBox:    { background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, maxWidth: '80vw', width: '100%', maxHeight: '85vh', boxShadow: '0 24px 64px rgba(0,0,0,0.85)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  mapHeader: { display: 'flex', alignItems: 'center', padding: '0.8rem 1rem', borderBottom: '1px solid rgba(212,175,55,0.1)' },
  mapIframe: { width: '100%', height: '60vh', border: 'none', display: 'block' },
};

const S = {
  card: { position: 'relative', background: COLOR.glass, borderRadius: 14, overflow: 'hidden', cursor: 'default', transition: 'box-shadow 0.25s, transform 0.1s ease-out', backdropFilter: 'blur(18px)', transformStyle: 'preserve-3d' },
  photoWrap: { position: 'relative', width: '100%', height: 180, overflow: 'hidden', background: '#0d0a13' },
  photo: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease, filter 0.5s' },
  fallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#0d0a13,#1c1622)' },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(transparent, ${COLOR.glass})`, pointerEvents: 'none', zIndex: 1 },
  categoryChip: { position: 'absolute', bottom: 10, left: 12, padding: '0.3rem 0.6rem', background: 'rgba(8,6,10,0.8)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.12em', color: COLOR.gold, zIndex: 2 },
  aiBadge: { position: 'absolute', top: 10, left: 12, padding: '0.25rem 0.6rem', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.12em', color: COLOR.gold, zIndex: 2 },
  claimBadgeCluster: { position: 'absolute', top: 10, right: 12, display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 2 },
  claimIconBadge: { width: 22, height: 22, borderRadius: '50%', background: 'rgba(13,10,19,0.9)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: '0.55rem', cursor: 'pointer', transition: 'all 0.2s', color: COLOR.gold },
  editIconBadge: { position: 'absolute', top: 10, right: 12, width: 26, height: 26, borderRadius: '50%', background: 'rgba(13,10,19,0.9)', border: `1px solid ${COLOR.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', zIndex: 2 },
  body: { padding: '1.1rem 1.2rem' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' },
  name: { fontFamily: FONT.display, fontSize: '1.25rem', fontWeight: 500, fontStyle: 'italic', color: COLOR.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  metaRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' },
  metaText: { fontFamily: FONT.body, fontSize: '0.74rem', color: COLOR.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  distPill: { fontFamily: FONT.mono, fontSize: '0.68rem', fontWeight: 600, color: 'rgba(100,200,255,0.95)', padding: '0.18rem 0.5rem', border: '1px solid rgba(100,200,255,0.25)', borderRadius: 10, background: 'rgba(100,200,255,0.06)' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' },
  statusDot: { width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 },
  statusText: { fontFamily: FONT.body, fontSize: '0.7rem' },
  ratingWrap: { marginBottom: '0.7rem' },
  aiDrawerContainer: { background: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(212,175,55,0.15)', borderRadius: 8, padding: '0.5rem', marginBottom: '0.75rem' },
  aiEnrichBtn: { width: '100%', padding: '0.6rem', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 6, color: COLOR.gold, fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', textAlign: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease', boxShadow: '0 0 10px rgba(212,175,55,0.2)', animation: 'pulse 2s infinite' },
  aiInsightBody: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  aiInsightText: { fontFamily: FONT.body, fontSize: '0.68rem', color: COLOR.textMuted, margin: 0, lineHeight: 1.3 },
  aiPricePill: { display: 'inline-block', fontFamily: FONT.mono, fontSize: '0.65rem', color: '#000', background: 'linear-gradient(135deg, #FFF2A8, #D4AF37)', padding: '0.3rem 0.6rem', borderRadius: 4, letterSpacing: '0.05em', fontWeight: 'bold' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.8rem' },
  tag: { padding: '0.25rem 0.55rem', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 20, fontFamily: FONT.body, fontSize: '0.64rem', color: COLOR.gold },
  tagMuted: { fontFamily: FONT.body, fontSize: '0.64rem', color: COLOR.textGhost },
  tagGender: { padding: '0.25rem 0.55rem', border: '1px solid rgba(100,200,255,0.15)', borderRadius: 20, fontFamily: FONT.body, fontSize: '0.64rem', color: 'rgba(130,200,255,0.9)' },
  divider: { height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.1), transparent)', marginBottom: '0.75rem' },
  contactRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' },
  contactItem: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' },
  priceNote: { fontFamily: FONT.body, fontSize: '0.64rem', color: COLOR.textGhost, marginLeft: 'auto' },
  actions: { display: 'flex', gap: '0.4rem', width: '100%' },
  dashboardBtn: { flex: 1, padding: '0.55rem 0.75rem', background: 'rgba(212,175,55,0.06)', border: `1px solid ${COLOR.goldDim}`, color: COLOR.gold, borderRadius: 8, fontFamily: FONT.body, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  scheduleBtn: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.65rem', background: 'rgba(212,175,55,0.06)', border: `1px solid ${COLOR.goldDim}`, borderRadius: 8, fontFamily: FONT.body, fontSize: '0.68rem', fontWeight: 600, color: COLOR.gold, cursor: 'pointer', whiteSpace: 'nowrap' },
  primaryBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem 0.75rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 8, fontFamily: FONT.body, fontSize: '0.72rem', fontWeight: 600, color: '#1a1410', cursor: 'pointer' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'transparent', border: `1px solid ${COLOR.edge}`, borderRadius: 8, color: COLOR.textPrimary, cursor: 'pointer' }
};