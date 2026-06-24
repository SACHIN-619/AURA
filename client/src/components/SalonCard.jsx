// Salon card — redesigned for visual hierarchy befitting a boutique
// marketplace: large display-font name as the clear focal point, line
// icons instead of emoji (consistent rendering across browsers), generous
// spacing between sections, and a single confident primary action instead
// of two competing buttons. Every fact shown is still honestly sourced —
// no fake ratings, no fake pricing, no fake availability — this pass is
// purely about presentation, not data.
import { useState, forwardRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { safeAddress, safeCoords } from '../context/AuraContext';
import { getSalonPhoto, parseOpeningHours, CATEGORY_LABELS, COLOR, FONT, SPRING } from '../utils/tokens';
import { PinIcon, PhoneIcon, GlobeIcon, RouteIcon, MessageIcon } from './icons.jsx';
import BookingModal from './BookingModal';
import RatingDisplay from './RatingDisplay';
import BookingSuccess from './BookingSuccess';
import VerifiedListingBadge from './VerifiedListingBadge';

export const cardVariants = {
  hidden:{opacity:0,y:32,scale:0.97},
  show:{opacity:1,y:0,scale:1,transition:SPRING.default},
};

function hav(lat1,lon1,lat2,lon2){const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

const SalonCard = forwardRef(function SalonCard({salon,idx=0,isMatch=false}, ref) {
  const {userLocation,trackEvent}=useAura();
  const { t } = useLanguage();
  const [imgFailed,setImgFailed]=useState(false);
  const [hov,setHov]=useState(false);
  const [rx,setRx]=useState(0);const [ry,setRy]=useState(0);
  const [showBook,setShowBook]=useState(false);
  const [showOk,setShowOk]=useState(false);
  const [okData,setOkData]=useState(null);

  useEffect(() => {
    if (!salon._isDemo && salon._id) {
      trackEvent('view', { salonId: salon._id, hub: salon.hub });
    }
  }, []); // eslint-disable-line

  const name       = typeof salon.name==='string'?salon.name:'Unnamed Salon';
  const hub        = typeof salon.hub==='string'?salon.hub:'';
  const addr       = safeAddress(salon);
  const coords     = safeCoords(salon);
  const hours      = parseOpeningHours(typeof salon.openingHours==='string'?salon.openingHours:'');
  const categories = Array.isArray(salon.serviceCategories) ? salon.serviceCategories : [];
  const gender     = typeof salon.servesGender==='string' ? salon.servesGender : null;
  const hasPhone   = !!salon?.contact?.phone;
  const hasWeb     = !!salon?.contact?.website;

  let distLabel=null;
  if(userLocation&&coords){const km=hav(userLocation.lat,userLocation.lon,coords.lat,coords.lon);distLabel=km<1?`${Math.round(km*1000)} m`:`${km.toFixed(1)} km`;}

  const mapsUrl=coords?`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`:`https://www.google.com/maps/search/${encodeURIComponent(name+' '+hub+' Hyderabad')}`;

  const onMove=(e)=>{const r=e.currentTarget.getBoundingClientRect();setRx(-((e.clientY-r.top-r.height/2)/(r.height/2))*5);setRy(((e.clientX-r.left-r.width/2)/(r.width/2))*5);};
  const onLeave=()=>{setRx(0);setRy(0);setHov(false);};

  return (
    <>
      <motion.article ref={ref} variants={cardVariants}
        style={{...S.card,border:`1px solid ${isMatch?'rgba(212,175,55,0.55)':'rgba(212,175,55,0.16)'}`,boxShadow:hov?'0 14px 40px rgba(0,0,0,0.45)':isMatch?'0 0 28px rgba(212,175,55,0.16)':'0 2px 12px rgba(0,0,0,0.18)',transform:`perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${hov?4:0}px)`,transition:hov?'transform 0.12s ease-out, box-shadow 0.25s':'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s'}}
        onMouseMove={e=>{setHov(true);onMove(e);}} onMouseLeave={onLeave}>

        {/* Photo — slightly taller for a more editorial, boutique feel */}
        <div style={S.photoWrap}>
          {!imgFailed?<img src={getSalonPhoto(salon,idx)} alt={name} loading="lazy" onError={()=>setImgFailed(true)} style={{...S.photo,transform:hov?'scale(1.06)':'scale(1)',filter:hov?'brightness(0.92) saturate(1.15)':'brightness(0.8) saturate(1.05)'}}/>
          :<div style={S.fallback}><svg viewBox="0 0 120 80" fill="none" style={{width:56,opacity:0.28}}><rect x="10" y="25" width="100" height="45" rx="4" stroke="#D4AF37" strokeWidth="1.4"/><circle cx="35" cy="47" r="11" stroke="#D4AF37" strokeWidth="1.1"/><circle cx="85" cy="47" r="11" stroke="#D4AF37" strokeWidth="1.1"/><path d="M46 47L74 47M60 13L60 25" stroke="#D4AF37" strokeWidth="1.4"/><circle cx="60" cy="10" r="4" fill="#D4AF37" opacity=".5"/></svg></div>}
          <div style={S.fade}/>

          {/* Tier-style category chip overlapping the photo, boutique-card convention */}
          {categories.length > 0 && (
            <span style={S.categoryChip}>{(CATEGORY_LABELS[categories[0]]||categories[0]).toUpperCase()}</span>
          )}

          {isMatch&&<div style={S.aiBadge}>✦ AI MATCH</div>}
          {salon._isDemo&&<div style={S.demoBadge}>{t('card_demo_badge')}</div>}
        </div>

        {/* Body — isolation:isolate prevents backdrop-filter blur on tilt */}
        <div style={{...S.body,isolation:'isolate'}}>
          <div style={S.nameRow}>
            <h2 style={S.name}>{name}</h2>
            {salon.listingVerified && <VerifiedListingBadge size={15} />}
          </div>

          {addr && (
            <div style={S.metaRow}>
              <PinIcon size={11} />
              <span style={S.metaText}>{addr || hub}</span>
              {distLabel && <span style={S.distPill}>{distLabel}</span>}
            </div>
          )}

          <div style={{ ...S.statusRow, color: hours.isOpen===true?'#4CAF50':hours.isOpen===false?'#EF5350':COLOR.textGhost }}>
            <span style={S.statusDot} />
            <span style={S.statusText}>{hours.label}</span>
          </div>

          <div style={S.ratingWrap}>
            <RatingDisplay salon={salon} />
          </div>

          {/* Service category tags — boutique pill style, gold outline */}
          <div style={S.tags}>
            {categories.length
              ? categories.slice(0,3).map(cat=>(
                  <span key={cat} style={S.tag}>{CATEGORY_LABELS[cat]||cat}</span>
                ))
              : <span style={S.tagMuted}>{t('card_category_unlisted')}</span>}
            {gender && <span style={S.tagGender}>{gender}</span>}
          </div>

          <div style={S.divider} />

          {/* Contact availability — clear icon row instead of dense pills */}
          <div style={S.contactRow}>
            {hasPhone && <span style={S.contactItem}><PhoneIcon size={12} color={COLOR.gold} /></span>}
            {hasWeb   && <span style={S.contactItem}><GlobeIcon size={12} color={COLOR.gold} /></span>}
            {!hasPhone && !hasWeb && <span style={S.noContactText}>{t('card_no_contact')}</span>}
            <span style={S.priceNote}>{t('card_price_note')}</span>
          </div>

          {/* Primary action — single confident CTA, secondary route action
              demoted to a quiet icon-only button beside it */}
          <div style={S.actions}>
            <motion.button style={S.primaryBtn} onClick={()=>setShowBook(true)}
              whileHover={{ filter: 'brightness(1.08)', scale: 1.015 }} whileTap={{ scale: 0.97 }}>
              <MessageIcon size={13} color="#1a1410" />
              <span>{t('card_contact')}</span>
            </motion.button>
            <motion.button style={S.iconBtn} onClick={()=>{trackEvent('route_click',{salonId:salon._id,hub:salon.hub});window.open(mapsUrl,'_blank','noopener,noreferrer');}} title={t('card_route')}
              whileHover={{ borderColor: 'rgba(212,175,55,0.5)', backgroundColor: 'rgba(212,175,55,0.06)' }} whileTap={{ scale: 0.93 }}>
              <RouteIcon size={14} />
            </motion.button>
          </div>
        </div>
      </motion.article>

      <AnimatePresence>
        {showBook&&<BookingModal key="bm" salon={salon} onClose={()=>setShowBook(false)} onSuccess={d=>{setOkData(d);setShowOk(true);}}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showOk&&okData&&<BookingSuccess key="bs" salonName={okData.salonName} hub={okData.hub} bookingDate={okData.date} bookingSlot={okData.slot} userLocation={userLocation} salonCoords={coords} viaWhatsApp={okData.viaWhatsApp} onClose={()=>setShowOk(false)}/>}
      </AnimatePresence>
    </>
  );
});

export default SalonCard;

const S={
  card:{position:'relative',background:COLOR.glass,borderRadius:14,overflow:'hidden',cursor:'default',willChange:'transform',backdropFilter:'blur(18px)'},
  photoWrap:{position:'relative',width:'100%',height:198,overflow:'hidden',background:'#0d0a13'},
  photo:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.5s'},
  fallback:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(145deg,#0d0a13,#1c1622)'},
  fade:{position:'absolute',bottom:0,left:0,right:0,height:80,background:`linear-gradient(transparent,${COLOR.glass})`,pointerEvents:'none',zIndex:1},
  categoryChip:{position:'absolute',bottom:11,left:12,padding:'0.32rem 0.7rem',background:'rgba(8,6,10,0.72)',backdropFilter:'blur(6px)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:20,fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.16em',color:COLOR.gold,zIndex:2},
  aiBadge:{position:'absolute',top:11,left:12,padding:'0.3rem 0.65rem',background:'rgba(212,175,55,0.18)',border:'1px solid rgba(212,175,55,0.45)',borderRadius:20,fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.18em',color:COLOR.gold,zIndex:2},
  demoBadge:{position:'absolute',top:11,right:12,padding:'0.24rem 0.55rem',background:'rgba(0,0,0,0.65)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:4,fontFamily:FONT.mono,fontSize:'0.36rem',letterSpacing:'0.14em',color:'rgba(255,255,255,0.55)',zIndex:2},
  body:{padding:'1.15rem 1.25rem 1.2rem'},
  nameRow:{display:'flex',alignItems:'flex-start',gap:'0.4rem',marginBottom:'0.45rem'},
  name:{fontFamily:FONT.display,fontSize:'1.34rem',fontWeight:500,fontStyle:'italic',color:COLOR.textPrimary,lineHeight:1.15,letterSpacing:'0.01em',flex:1,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical'},
  metaRow:{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.55rem'},
  metaText:{fontFamily:FONT.body,fontSize:'0.78rem',color:COLOR.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1},
  distPill:{flexShrink:0,fontFamily:FONT.mono,fontSize:'0.38rem',letterSpacing:'0.08em',color:'rgba(100,200,255,0.85)',padding:'0.15rem 0.4rem',border:'1px solid rgba(100,200,255,0.25)',borderRadius:10},
  statusRow:{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.7rem'},
  statusDot:{width:6,height:6,borderRadius:'50%',background:'currentColor',boxShadow:'0 0 5px currentColor',flexShrink:0},
  statusText:{fontFamily:FONT.body,fontSize:'0.72rem',letterSpacing:'0.01em'},
  ratingWrap:{marginBottom:'0.75rem'},
  tags:{display:'flex',flexWrap:'wrap',gap:'0.35rem',marginBottom:'0.85rem'},
  tag:{padding:'0.28rem 0.62rem',border:'1px solid rgba(212,175,55,0.28)',borderRadius:20,fontFamily:FONT.body,fontSize:'0.66rem',fontWeight:500,letterSpacing:'0.01em',color:COLOR.gold,background:'rgba(212,175,55,0.05)'},
  tagMuted:{padding:'0.28rem 0.62rem',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,fontFamily:FONT.body,fontSize:'0.66rem',color:COLOR.textGhost,fontStyle:'italic'},
  tagGender:{padding:'0.28rem 0.62rem',border:'1px solid rgba(100,200,255,0.22)',borderRadius:20,fontFamily:FONT.body,fontSize:'0.66rem',fontWeight:500,textTransform:'capitalize',color:'rgba(130,200,255,0.95)',background:'rgba(100,200,255,0.04)'},
  divider:{height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.12),transparent)',marginBottom:'0.8rem'},
  contactRow:{display:'flex',alignItems:'center',gap:'0.55rem',marginBottom:'0.95rem'},
  contactItem:{display:'flex',alignItems:'center',justifyContent:'center',width:24,height:24,borderRadius:'50%',background:'rgba(212,175,55,0.08)',border:'1px solid rgba(212,175,55,0.18)',flexShrink:0},
  noContactText:{fontFamily:FONT.body,fontSize:'0.68rem',color:COLOR.textGhost,fontStyle:'italic'},
  priceNote:{fontFamily:FONT.body,fontSize:'0.66rem',color:COLOR.textGhost,fontStyle:'italic',marginLeft:'auto',textAlign:'right'},
  actions:{display:'flex',gap:'0.5rem'},
  primaryBtn:{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem',padding:'0.62rem 0.8rem',background:'linear-gradient(135deg,#FFF2A8,#D4AF37)',border:'none',borderRadius:9,fontFamily:FONT.body,fontSize:'0.74rem',fontWeight:600,letterSpacing:'0.02em',color:'#1a1410',cursor:'pointer'},
  iconBtn:{display:'flex',alignItems:'center',justifyContent:'center',width:40,flexShrink:0,background:'transparent',border:`1px solid ${COLOR.edge}`,borderRadius:9,cursor:'pointer',color:COLOR.textPrimary},
};
