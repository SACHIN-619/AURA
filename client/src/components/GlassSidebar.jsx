import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { CATEGORY_FILTERS, GENDER_FILTERS, COLOR, FONT } from '../utils/tokens';
import { PinIcon } from './icons.jsx';

export default function GlassSidebar() {
  const {allHubs,activeHub,syncHub,activeFilters,toggleFilter,genderFilter,setGenderFilter,stats,syncing,userLocation,setUserLocation} = useAura();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search,     setSearch]     = useState('');
  const [locLabel,   setLocLabel]   = useState('');

  // Reverse-geocode the user's coordinates into a readable place name
  // (free, no API key — uses the same Nominatim service we already rely on)
  useEffect(() => {
    if (!userLocation) { setLocLabel(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lon}&format=json&zoom=14`, { headers: { 'Accept-Language': 'en' } });
        const d = await r.json();
        const place = d.address?.suburb || d.address?.neighbourhood || d.address?.city_district || d.address?.city || d.address?.town || d.address?.state_district;
        if (!cancelled) setLocLabel(place || `${userLocation.lat.toFixed(3)}, ${userLocation.lon.toFixed(3)}`);
      } catch {
        if (!cancelled) setLocLabel(`${userLocation.lat.toFixed(3)}, ${userLocation.lon.toFixed(3)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [userLocation]);

  // Close on outside click
  useEffect(()=>{
    const h=(e)=>{if(mobileOpen&&!e.target.closest('#aura-sidebar')&&!e.target.closest('#hamburger'))setMobileOpen(false);};
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[mobileOpen]);

  const handleHub=(hub)=>{ syncHub(hub); setMobileOpen(false); };
  const filtered = allHubs.filter(h=>h.hub.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Hamburger — shown on mobile via CSS */}
      <button id="hamburger" onClick={()=>setMobileOpen(o=>!o)}
        aria-label="Toggle navigation" aria-expanded={mobileOpen}
        style={{display:'none',position:'fixed',top:'1rem',left:'1rem',zIndex:600,width:40,height:40,background:'rgba(18,14,24,0.88)',border:'1px solid rgba(212,175,55,0.25)',borderRadius:8,backdropFilter:'blur(20px)',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer'}}>
        <span style={{display:'block',width:18,height:1.5,background:COLOR.gold,transition:'all 0.3s',transform:mobileOpen?'translateY(6.5px) rotate(45deg)':'none'}}/>
        <span style={{display:'block',width:18,height:1.5,background:COLOR.gold,transition:'all 0.3s',opacity:mobileOpen?0:1}}/>
        <span style={{display:'block',width:18,height:1.5,background:COLOR.gold,transition:'all 0.3s',transform:mobileOpen?'translateY(-6.5px) rotate(-45deg)':'none'}}/>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen&&<motion.div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(3,2,4,0.6)',backdropFilter:'blur(4px)'}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMobileOpen(false)}/>}
      </AnimatePresence>

      {/* Sidebar */}
      <aside id="aura-sidebar" className={`sidebar-desktop${mobileOpen?' mobile-open':''}`}
        style={{position:'fixed',top:0,left:0,width:280,maxWidth:'85vw',height:'100vh',background:'rgba(18,14,24,0.72)',backdropFilter:'blur(30px) saturate(180%)',WebkitBackdropFilter:'blur(30px) saturate(180%)',borderRight:'1px solid rgba(212,175,55,0.15)',display:'flex',flexDirection:'column',padding:'2rem 1.5rem',zIndex:500,overflowY:'auto',overflowX:'hidden',transition:'transform 0.35s ease'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)'}}/>

        <div style={{fontFamily:FONT.display,fontSize:'1.7rem',fontWeight:300,letterSpacing:'0.4em',color:COLOR.gold,marginBottom:'0.3rem',textShadow:'0 0 40px rgba(212,175,55,0.28)'}}>AURA</div>
        <div style={{fontFamily:FONT.mono,fontSize:'0.48rem',letterSpacing:'0.33em',color:COLOR.textMuted,marginBottom:'1.5rem'}}>HYDERABAD · TELANGANA</div>

        {userLocation&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',marginBottom:'1rem',padding:'0.35rem 0.65rem',background:'rgba(100,200,255,0.05)',border:'1px solid rgba(100,200,255,0.12)',borderRadius:6}}>
            <span style={{display:'flex',alignItems:'center',gap:'0.35rem',fontFamily:FONT.body,fontSize:'0.72rem',color:'rgba(140,205,255,0.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              <PinIcon size={12} color="rgba(140,205,255,0.9)" />
              {locLabel || 'Locating…'}
            </span>
            <button onClick={()=>setUserLocation(null)} style={{flexShrink:0,background:'none',border:'none',color:'rgba(255,248,220,0.3)',fontSize:'0.6rem',cursor:'pointer',padding:'0.1rem 0.3rem'}} title="Clear location">✕</button>
          </div>
        )}

        <div style={{fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.22em',color:COLOR.textGhost,marginBottom:'0.7rem'}}>{t('sidebar_find_hub')}</div>
        <div style={{display:'flex',alignItems:'center',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:7,marginBottom:'0.9rem',overflow:'hidden'}}>
          <span style={{padding:'0 0.6rem',fontSize:'0.8rem',color:COLOR.textGhost,flexShrink:0}}>🔎</span>
          <input style={{flex:1,padding:'0.5rem 0.3rem',background:'transparent',border:'none',outline:'none',fontFamily:FONT.body,fontSize:'0.82rem',color:COLOR.textPrimary,minWidth:0}} placeholder={t('sidebar_search_areas')} value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button style={{padding:'0 0.6rem',background:'none',border:'none',color:COLOR.textGhost,fontSize:'0.7rem',cursor:'pointer'}} onClick={()=>setSearch('')}>✕</button>}
        </div>

        <div style={{fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.22em',color:COLOR.textGhost,marginBottom:'0.7rem'}}>{t('sidebar_popular_hubs')}</div>
        <nav style={{maxHeight:'30vh',overflowY:'auto',paddingRight:'0.2rem'}}>
          {filtered.map(h=><HubBtn key={h.hub} h={h} active={activeHub===h.hub} disabled={syncing} onClick={()=>handleHub(h.hub)}/>)}
          {!filtered.length&&<p style={{fontFamily:FONT.mono,fontSize:'0.44rem',color:COLOR.textGhost,padding:'0.5rem 0'}}>No areas match</p>}
        </nav>

        <div style={{width:'100%',height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.15),transparent)',margin:'1.2rem 0',flexShrink:0}}/>

        {/* Real OSM-derived service categories — not a fake priced menu */}
        <div style={{fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.22em',color:COLOR.textGhost,marginBottom:'0.7rem'}}>{t('sidebar_filter_category')}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.28rem',marginBottom:'0.9rem'}}>
          {CATEGORY_FILTERS.map(f=>(
            <button key={f.tag} onClick={()=>toggleFilter(f.tag)} aria-pressed={activeFilters.has(f.tag)}
              style={{display:'inline-flex',alignItems:'center',gap:'0.32rem',padding:'0.32rem 0.65rem',border:`1px solid ${activeFilters.has(f.tag)?'rgba(212,175,55,0.5)':'rgba(212,175,55,0.13)'}`,borderRadius:20,fontFamily:FONT.body,fontSize:'0.7rem',fontWeight:500,color:activeFilters.has(f.tag)?COLOR.gold:COLOR.textMuted,cursor:'pointer',background:activeFilters.has(f.tag)?'rgba(212,175,55,0.06)':'transparent',transition:'all 0.2s'}}>
              <span style={{width:4,height:4,borderRadius:'50%',background:COLOR.gold,opacity:activeFilters.has(f.tag)?1:0.3,flexShrink:0}}/>
              {f.label}
            </button>
          ))}
        </div>

        {/* Who the salon serves — only real OSM unisex/male/female tags */}
        <div style={{fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.22em',color:COLOR.textGhost,marginBottom:'0.7rem'}}>{t('sidebar_serves')}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.28rem',marginBottom:'0.5rem'}}>
          {GENDER_FILTERS.map(g=>(
            <button key={g.value} onClick={()=>setGenderFilter(g.value)} aria-pressed={genderFilter===g.value}
              style={{padding:'0.32rem 0.65rem',border:`1px solid ${genderFilter===g.value?'rgba(212,175,55,0.5)':'rgba(212,175,55,0.13)'}`,borderRadius:20,fontFamily:FONT.body,fontSize:'0.7rem',fontWeight:500,color:genderFilter===g.value?COLOR.gold:COLOR.textMuted,cursor:'pointer',background:genderFilter===g.value?'rgba(212,175,55,0.06)':'transparent',transition:'all 0.2s'}}>
              {g.label}
            </button>
          ))}
        </div>

        <div style={{width:'100%',height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.15),transparent)',margin:'1.2rem 0',flexShrink:0}}/>
        {/* Real stats only — no fake "AVG RATING" since we have no real rating data yet */}
        {[[t('sidebar_salons_live'),stats.total||'—'],[t('sidebar_active_hub'),(activeHub||'—').split(' ')[0]]].map(([l,v])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'0.75rem'}}>
            <span style={{fontFamily:FONT.mono,fontSize:'0.43rem',letterSpacing:'0.17em',color:COLOR.textGhost}}>{l}</span>
            <span style={{fontFamily:FONT.display,fontSize:'1.15rem',fontWeight:600,color:COLOR.gold}}>{v}</span>
          </div>
        ))}
      </aside>
    </>
  );
}

function HubBtn({h,active,disabled,onClick}) {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:'relative',width:'100%',padding:'0.78rem 1rem 0.78rem 1.2rem',marginBottom:'0.4rem',background:active?'rgba(212,175,55,0.05)':'transparent',border:`1px solid ${active?'rgba(212,175,55,0.45)':hov?'rgba(212,175,55,0.25)':'rgba(212,175,55,0.08)'}`,borderRadius:6,color:COLOR.textPrimary,fontFamily:FONT.display,fontSize:'0.93rem',fontWeight:300,textAlign:'left',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,display:'flex',flexDirection:'column',transition:'border-color 0.2s,background 0.2s,transform 0.2s',transform:hov&&!disabled?'translateX(3px)':'none'}}>
      <span style={{position:'absolute',left:0,top:'20%',width:2,height:'60%',background:COLOR.gold,borderRadius:'0 2px 2px 0',transform:active?'scaleY(1)':'scaleY(0)',transformOrigin:'center',transition:'transform 0.25s'}}/>
      <span style={{display:'block'}}>{h.hub}</span>
      {/* Real synced count only — no fake star rating */}
      <span style={{display:'block',fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.12em',color:COLOR.textMuted,marginTop:'0.1rem'}}>{h.count||0} SALONS SYNCED</span>
    </button>
  );
}
