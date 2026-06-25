// // import { useState, useRef } from 'react';
// // import { motion, AnimatePresence } from 'framer-motion';
// // import { useAura, API } from '../context/AuraContext';
// // import { useLanguage } from '../i18n/LanguageContext.jsx';
// // import { COLOR, FONT } from '../utils/tokens';

// // export default function LocationOnboarding({onComplete}) {
// //   const {allHubs, syncHub, resolveNearestHub, pushToast} = useAura();
// //   const { t } = useLanguage();
// //   const [stage, setStage] = useState('pip'); 
// //   const [query, setQuery] = useState('');
// //   const [results, setResults] = useState([]);
// //   const [busy, setBusy] = useState(false);
// //   const debRef = useRef(null);

// //   const pickHub = async(hub) => {
// //     setBusy(true);
// //     try { 
// //       await syncHub(hub); 
// //       onComplete(); 
// //     }
// //     catch { 
// //       onComplete(); 
// //     } 
// //     finally { 
// //       setBusy(false); 
// //     }
// //   };

// //   const tryLocation = () => {
// //     if(!navigator.geolocation){ setStage('search'); return; }
// //     setStage('locating');
// //     navigator.geolocation.getCurrentPosition(
// //       async pos => {
// //         try {
// //           const res = await resolveNearestHub(pos.coords.latitude, pos.coords.longitude);
// //           const hub = res?.hub;
// //           const distanceKm = res?.distanceKm;
// //           const inServiceArea = res?.inServiceArea;

// //           if(!inServiceArea){
// //             pushToast(
// //               distanceKm
// //                 ? `You're ${distanceKm} km away from our active service zones. Loading closest available dynamic salon cluster node.`
// //                 : `Couldn't confirm coverage context parameters. Loading closest cluster hub point.`,
// //               'info'
// //             );
// //           }
// //           if(hub) await pickHub(hub);
// //           else setStage('search');
// //         } catch {
// //           setStage('search');
// //         }
// //       },
// //       ()=>setStage('denied'),
// //       {timeout:8000,maximumAge:60000}
// //     );
// //   };

// //   const onSearch = val => {
// //     setQuery(val);
// //     clearTimeout(debRef.current);
// //     if(!val.trim() || val.trim().length < 2){ setResults([]); return; }
    
// //     debRef.current = setTimeout(async () => {
// //       try {
// //         const r = await fetch(`${API}/api/search/autocomplete?q=${encodeURIComponent(val.trim())}`);
// //         const d = await r.json();
// //         let combined = d.results || [];

// //         const defaultCity = import.meta.env.VITE_MARKETPLACE_DEFAULT_CITY || "Hyderabad";
// //         const defaultState = import.meta.env.VITE_MARKETPLACE_DEFAULT_STATE || "Telangana";
// //         const defaultCountry = import.meta.env.VITE_MARKETPLACE_COUNTRY_FOCUS || "India";

// //         let contextBoundingString = `, ${defaultCity}, ${defaultState}, ${defaultCountry}`;

// //         if (combined.length > 0 && combined[0].address) {
// //           const sample = combined[0].address;
// //           contextBoundingString = `, ${sample.city || defaultCity}, ${sample.state || defaultState}, ${defaultCountry}`;
// //         }

// //         try {
// //           const geo = await fetch(
// //             `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val.trim() + contextBoundingString)}&format=json&limit=4`,
// //             { headers: { 'Accept-Language': 'en' } }
// //           );
// //           const places = await geo.json();
// //           const areaResults = (places || [])
// //             .filter(p => !combined.some(c => c.hub === (p.display_name || '').split(',')[0]))
// //             .map(p => ({
// //               _id: `osm-${p.place_id}`,
// //               name: (p.display_name || '').split(',')[0],
// //               hub: (p.display_name || '').split(',')[0],
// //               isNewArea: true,
// //               lat: parseFloat(p.lat),
// //               lon: parseFloat(p.lon),
// //             }));
// //           combined = [...combined, ...areaResults].slice(0, 10);
// //         } catch (osmErr) { 
// //           /* Optional fallback tracker */ 
// //         }

// //         setResults(combined);
// //       } catch (err) {
// //         const cleanHubs = (allHubs || []).filter(h => h && h.hub && !(h.hub instanceof Promise));
// //         setResults(cleanHubs.filter(h => String(h.hub).toLowerCase().includes(val.toLowerCase())).map(h => ({ _id: h.hub, name: h.hub, hub: h.hub, count: h.count })));
// //       }
// //     }, 250);
// //   };
  
// //   const skip = async() => {
// //     const first = allHubs?.[0]?.hub;
// //     if(first && !(first instanceof Promise)) await pickHub(first);
// //     else onComplete();
// //   };

// //   return (
// //     <motion.div style={S.overlay} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:0.5}}}>
// //       <div style={S.glow1}/><div style={S.glow2}/>
// //       <div style={S.wrap}>
// //         <motion.div style={S.brand} initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
// //           <span style={S.brandSymbol}>✦</span>
// //           <span style={S.brandName}>AURA</span>
// //         </motion.div>
// //         <motion.p style={S.tagline} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
// //           {t('brand_tagline')}
// //         </motion.p>

// //         <AnimatePresence mode="wait">
// //           {stage==='pip' && (
// //             <motion.div key="pip" style={S.card} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{delay:0.25,type:'spring',stiffness:200,damping:22}}>
// //               <div style={S.pipCenter}>
// //                 <div style={S.pipEmoji}>📍</div>
// //                 <h2 style={S.pipTitle}>{t('onboard_pip_title')}</h2>
// //                 <p style={S.pipSub}>{t('onboard_pip_sub')}</p>
// //               </div>
// //               <div style={S.ctaStack}>
// //                 <motion.button style={S.ctaPrimary} onClick={tryLocation} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>
// //                   📍&nbsp;&nbsp;{t('onboard_use_location')}
// //                 </motion.button>
// //                 <motion.button style={S.ctaSecondary} onClick={()=>setStage('search')} whileHover={{borderColor:'rgba(212,175,55,0.4)'}} whileTap={{scale:0.97}}>
// //                   🔎&nbsp;&nbsp;{t('onboard_search_location')}
// //                 </motion.button>
// //                 <button style={S.ctaSkip} onClick={skip}>{t('onboard_skip')} →</button>
// //               </div>
// //             </motion.div>
// //           )}

// //           {stage==='locating' && (
// //             <motion.div key="locating" style={{...S.card,...S.centred}} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}}>
// //               <motion.div style={S.ring} animate={{rotate:360}} transition={{duration:1.2,repeat:Infinity,ease:'linear'}}/>
// //               <p style={S.locLabel}>{t('onboard_locating')}</p>
// //               <p style={S.locSub}>{t('onboard_locating_sub')}</p>
// //               <button style={S.ctaSkip} onClick={()=>setStage('denied')}>{t('onboard_search_trouble')}</button>
// //             </motion.div>
// //           )}

// //           {stage==='denied' && (
// //             <motion.div key="denied" style={S.card} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
// //               <p style={S.deniedMsg}>{t('onboard_denied')}</p>
// //               <SearchUI t={t} query={query} results={results} allHubs={allHubs} busy={busy} onSearch={onSearch} onPick={r=>pickHub(r.hub||r.name)} onHub={pickHub}/>
// //               <button style={S.ctaSkip} onClick={skip}>{t('onboard_skip')} →</button>
// //             </motion.div>
// //           )}

// //           {stage==='search' && (
// //             <motion.div key="search" style={S.card} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
// //               <SearchUI t={t} query={query} results={results} allHubs={allHubs} busy={busy} onSearch={onSearch} onPick={r=>pickHub(r.hub||r.name)} onHub={pickHub}/>
// //               <div style={{display:'flex',gap:'0.8rem',marginTop:'0.5rem'}}>
// //                 <button style={S.ctaSkip} onClick={()=>setStage('pip')}>{t('onboard_back')}</button>
// //                 <button style={S.ctaSkip} onClick={skip}>{t('onboard_skip')} →</button>
// //               </div>
// //             </motion.div>
// //           )}
// //         </AnimatePresence>
// //       </div>
// //     </motion.div>
// //   );
// // }

// // function SearchUI({t,query,results,allHubs,busy,onSearch,onPick,onHub}) {
// //   const cleanHubs = (allHubs || []).filter(h => h && h.hub && !(h.hub instanceof Promise));

// //   return (
// //     <>
// //       <div style={S.searchBox}>
// //         <span style={S.sIcon}>{busy?'⟳':'🔎'}</span>
// //         <input style={S.sInput} value={query} onChange={e=>onSearch(e.target.value)}
// //           placeholder={t('onboard_search_placeholder')} autoFocus autoComplete="off"/>
// //       </div>
// //       <AnimatePresence>
// //         {results.length>0 && (
// //           <motion.div style={S.resultBox} initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
// //             {results.map((r,i)=>(
// //               <button key={r._id||i} style={S.resultItem} onMouseDown={()=>onPick(r)}>
// //                 <span style={S.rName}>{r.name}</span>
// //                 <span style={S.rMeta}>
// //                   {r.isNewArea ? 'New area · will sync live' : (r.hub||'')}
// //                   {r.count ? ` · ${r.count} salons synced` : ''}
// //                 </span>
// //               </button>
// //             ))}
// //           </motion.div>
// //         )}
// //       </AnimatePresence>
// //       {!query && (
// //         <div>
// //           <p style={S.hubLabel}>{cleanHubs.length ? t('onboard_popular_areas') : 'LOADING AREAS…'}</p>
// //           <div style={S.hubGrid}>
// //             {cleanHubs.map((h, i)=>(
// //               <button key={h.hub || i} style={S.hubChip} onClick={()=>onHub(h.hub)}>{String(h.hub)}</button>
// //             ))}
// //           </div>
// //         </div>
// //       )}
// //     </>
// //   );
// // }
// import { useState, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useAura, API } from '../context/AuraContext';
// import { useLanguage } from '../i18n/LanguageContext.jsx';
// import { COLOR, FONT } from '../utils/tokens';

// export default function LocationOnboarding({ onComplete }) {
//   const { allHubs, syncHub, resolveNearestHub, pushToast } = useAura();
//   const { t } = useLanguage();
//   const [stage, setStage] = useState('pip');
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState([]);
//   const [busy, setBusy] = useState(false);
//   const debRef = useRef(null);

//   const pickHub = async (hub) => {
//     setBusy(true);
//     try {
//       await syncHub(hub);
//       onComplete();
//     } catch {
//       onComplete();
//     } finally {
//       setBusy(false);
//     }
//   };

//   const tryLocation = () => {
//     if (!navigator.geolocation) { setStage('search'); return; }
//     setStage('locating');
//     navigator.geolocation.getCurrentPosition(
//       async (pos) => {
//         try {
//           const res = await resolveNearestHub(pos.coords.latitude, pos.coords.longitude);
//           const hub = res?.hub;
//           if (hub) await pickHub(hub);
//           else setStage('search');
//         } catch {
//           setStage('search');
//         }
//       },
//       () => setStage('denied'),
//       { timeout: 8000, maximumAge: 60000 }
//     );
//   };

//   const onSearch = (val) => {
//     setQuery(val);
//     clearTimeout(debRef.current);
//     if (!val.trim() || val.trim().length < 2) { setResults([]); return; }

//     debRef.current = setTimeout(async () => {
//       try {
//         const r = await fetch(`${API}/api/search/autocomplete?q=${encodeURIComponent(val.trim())}`);
//         const d = await r.json();
//         setResults(d.results || []);
//       } catch (err) {
//         // Fallback to local filtering
//         const filtered = (allHubs || []).filter(h => 
//           h && typeof h.hub === 'string' && h.hub.toLowerCase().includes(val.toLowerCase())
//         );
//         setResults(filtered);
//       }
//     }, 250);
//   };

//   const skip = async () => {
//     const first = allHubs?.[0]?.hub;
//     if (first && typeof first === 'string') await pickHub(first);
//     else onComplete();
//   };

//   return (
//     <motion.div style={S.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//       {/* ... (Keep your existing JSX structure here, but ensure SearchUI receives the props below) */}
//       <SearchUI 
//         t={t} 
//         query={query} 
//         results={results} 
//         allHubs={allHubs} 
//         busy={busy} 
//         onSearch={onSearch} 
//         onPick={(r) => pickHub(r.hub || r.name)} 
//         onHub={pickHub} 
//       />
//     </motion.div>
//   );
// }

// function SearchUI({ t, query, results, allHubs, busy, onSearch, onPick, onHub }) {
//   // CRITICAL FIX: Ensure we only map items that are strings or clean objects
//   const cleanHubs = (allHubs || []).filter(h => h && typeof h.hub === 'string');

//   return (
//     <>
//       <div style={S.searchBox}>
//         <input style={S.sInput} value={query} onChange={e => onSearch(e.target.value)} placeholder={t('onboard_search_placeholder')} />
//       </div>
//       <AnimatePresence>
//         {results.length > 0 && (
//           <div style={S.resultBox}>
//             {results.map((r, i) => (
//               <button key={r._id || i} style={S.resultItem} onMouseDown={() => onPick(r)}>
//                 <span style={S.rName}>{String(r.name || 'Unknown')}</span>
//               </button>
//             ))}
//           </div>
//         )}
//       </AnimatePresence>
//       {!query && (
//         <div style={S.hubGrid}>
//           {cleanHubs.map((h, i) => (
//             <button key={h.hub || i} style={S.hubChip} onClick={() => onHub(h.hub)}>
//               {h.hub}
//             </button>
//           ))}
//         </div>
//       )}
//     </>
//   );
// }

// // ... (Keep your existing S styles object)

// const S = {
//   overlay:    {position:'fixed',inset:0,zIndex:2000,background:'#030204',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',overflow:'auto'},
//   glow1:      {position:'absolute',top:-200,right:-100,width:500,height:500,borderRadius:'50%',background:'#D4AF37',filter:'blur(120px)',opacity:0.06,pointerEvents:'none'},
//   glow2:      {position:'absolute',bottom:-100,left:-50,width:400,height:400,borderRadius:'50%',background:'#5B1FA0',filter:'blur(120px)',opacity:0.05,pointerEvents:'none'},
//   wrap:       {position:'relative',zIndex:1,width:'100%',maxWidth:420,display:'flex',flexDirection:'column',alignItems:'center'},
//   brand:      {display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.4rem'},
//   brandSymbol:{color:'#D4AF37',fontSize:'1.3rem'},
//   brandName:  {fontFamily:FONT.display,fontSize:'clamp(2rem,8vw,3rem)',fontWeight:300,letterSpacing:'0.55em',color:'#D4AF37',textShadow:'0 0 60px rgba(212,175,55,0.4)'},
//   tagline:    {fontFamily:FONT.mono,fontSize:'clamp(0.35rem,1.6vw,0.46rem)',letterSpacing:'0.28em',color:'rgba(212,175,55,0.45)',marginBottom:'1.8rem',textAlign:'center'},
//   card:       {width:'100%',background:'rgba(18,14,24,0.85)',border:'1px solid rgba(212,175,55,0.18)',borderRadius:16,padding:'clamp(1.4rem,5vw,2rem)',backdropFilter:'blur(20px)',boxShadow:'0 24px 60px rgba(0,0,0,0.7)'},
//   centred:    {display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:'0.8rem'},
//   pipCenter:  {textAlign:'center',marginBottom:'1.6rem'},
//   pipEmoji:   {fontSize:'clamp(2rem,6vw,2.8rem)',marginBottom:'0.6rem',display:'block'},
//   pipTitle:   {fontFamily:FONT.display,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:300,color:COLOR.textPrimary,margin:'0 0 0.4rem'},
//   pipSub:     {fontFamily:FONT.mono,fontSize:'clamp(0.4rem,1.8vw,0.48rem)',letterSpacing:'0.12em',color:COLOR.textMuted},
//   ctaStack:   {display:'flex',flexDirection:'column',gap:'0.7rem'},
//   ctaPrimary: {width:'100%',padding:'clamp(0.75rem,3vw,0.95rem)',background:'linear-gradient(135deg,#FFF2A8,#D4AF37)',border:'none',borderRadius:10,fontFamily:FONT.mono,fontSize:'clamp(0.48rem,2vw,0.56rem)',letterSpacing:'0.18em',fontWeight:700,color:'#000',cursor:'pointer'},
//   ctaSecondary:{width:'100%',padding:'clamp(0.7rem,3vw,0.9rem)',background:'transparent',border:'1px solid rgba(212,175,55,0.28)',borderRadius:10,fontFamily:FONT.mono,fontSize:'clamp(0.46rem,2vw,0.54rem)',letterSpacing:'0.16em',color:'rgba(212,175,55,0.85)',cursor:'pointer',transition:'border-color 0.2s'},
//   ctaSkip:    {background:'none',border:'none',fontFamily:FONT.mono,fontSize:'clamp(0.4rem,1.8vw,0.46rem)',letterSpacing:'0.12em',color:'rgba(255,248,220,0.28)',cursor:'pointer',textAlign:'center',padding:'0.4rem',transition:'color 0.2s'},
//   ring:       {width:44,height:44,border:'2px solid rgba(212,175,55,0.15)',borderTop:'2px solid #D4AF37',borderRadius:'50%'},
//   locLabel:   {fontFamily:FONT.display,fontSize:'clamp(1rem,3vw,1.2rem)',color:COLOR.textPrimary},
//   locSub:     {fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.1em',color:COLOR.textMuted},
//   deniedMsg:  {fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.1em',color:'rgba(255,200,100,0.7)',marginBottom:'1rem',textAlign:'center'},
//   searchBox:  {display:'flex',alignItems:'center',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(212,175,55,0.22)',borderRadius:10,overflow:'hidden',marginBottom:'0.75rem'},
//   sIcon:      {padding:'0 0.8rem',color:'#D4AF37',fontSize:'0.95rem',flexShrink:0},
//   sInput:     {flex:1,padding:'clamp(0.65rem,2.5vw,0.85rem) 0.5rem',background:'transparent',border:'none',outline:'none',fontFamily:FONT.body,fontSize:'clamp(0.85rem,3vw,1rem)',color:COLOR.textPrimary,minWidth:0},
//   resultBox:  {background:'rgba(13,10,19,0.98)',border:'1px solid rgba(212,175,55,0.18)',borderRadius:8,overflow:'hidden',marginBottom:'0.75rem'},
//   resultItem: {width:'100%',padding:'0.65rem 0.9rem',background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',textAlign:'left',transition:'background 0.12s'},
//   rName:      {fontFamily:FONT.display,fontSize:'clamp(0.85rem,3vw,1rem)',color:COLOR.textPrimary},
//   rMeta:      {fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.1em',color:COLOR.textMuted,flexShrink:0,paddingLeft:'0.5rem'},
//   hubLabel:   {fontFamily:FONT.mono,fontSize:'0.42rem',letterSpacing:'0.2em',color:COLOR.textGhost,marginBottom:'0.55rem'},
//   hubGrid:    {display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'0.4rem',maxHeight:'40vh',overflowY:'auto',paddingRight:'0.2rem'},
//   hubChip:    {padding:'clamp(0.5rem,2vw,0.68rem)',background:'rgba(212,175,55,0.04)',border:'1px solid rgba(212,175,55,0.13)',borderRadius:7,fontFamily:FONT.body,fontSize:'clamp(0.78rem,2.5vw,0.85rem)',fontWeight:300,color:'rgba(255,248,220,0.75)',cursor:'pointer',transition:'all 0.18s',textAlign:'center'},
// };


import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT } from '../utils/tokens';

export default function LocationOnboarding({ onComplete }) {
  const { allHubs, syncHub, resolveNearestHub } = useAura();
  const { t } = useLanguage();
  const [stage, setStage] = useState('pip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  // Ensure allHubs is an array and filter out non-string hubs
  const cleanHubs = useMemo(() => {
    return Array.isArray(allHubs) 
      ? allHubs.filter(h => h && typeof h.hub === 'string') 
      : [];
  }, [allHubs]);

  const pickHub = async (hub) => {
    if (!hub || typeof hub !== 'string') return;
    setBusy(true);
    try {
      await syncHub(hub);
      onComplete();
    } catch {
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const tryLocation = () => {
    if (!navigator.geolocation) { setStage('search'); return; }
    setStage('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await resolveNearestHub(pos.coords.latitude, pos.coords.longitude);
          if (res?.hub) await pickHub(res.hub);
          else setStage('search');
        } catch {
          setStage('search');
        }
      },
      () => setStage('denied'),
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const skip = async () => {
    const first = cleanHubs[0]?.hub;
    if (first) await pickHub(first);
    else onComplete();
  };

  return (
    <motion.div style={S.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.glow1}/><div style={S.glow2}/>
      <div style={S.wrap}>
        <motion.div style={S.brand} initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}>
          <span style={S.brandSymbol}>✦</span>
          <span style={S.brandName}>AURA</span>
        </motion.div>
        <motion.p style={S.tagline} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
          {t('brand_tagline')}
        </motion.p>

        <AnimatePresence mode="wait">
          {stage === 'pip' && (
            <motion.div key="pip" style={S.card} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{delay:0.25,type:'spring',stiffness:200,damping:22}}>
              <div style={S.pipCenter}>
                <div style={S.pipEmoji}>📍</div>
                <h2 style={S.pipTitle}>{t('onboard_pip_title')}</h2>
                <p style={S.pipSub}>{t('onboard_pip_sub')}</p>
              </div>
              <div style={S.ctaStack}>
                <motion.button style={S.ctaPrimary} onClick={tryLocation} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>
                  📍&nbsp;&nbsp;{t('onboard_use_location')}
                </motion.button>
                <motion.button style={S.ctaSecondary} onClick={() => setStage('search')} whileHover={{borderColor:'rgba(212,175,55,0.4)'}} whileTap={{scale:0.97}}>
                  🔎&nbsp;&nbsp;{t('onboard_search_location')}
                </motion.button>
                <button style={S.ctaSkip} onClick={skip}>{t('onboard_skip')} →</button>
              </div>
            </motion.div>
          )}

          {stage === 'locating' && (
            <motion.div key="locating" style={{...S.card,...S.centred}} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}}>
              <motion.div style={S.ring} animate={{rotate:360}} transition={{duration:1.2,repeat:Infinity,ease:'linear'}}/>
              <p style={S.locLabel}>{t('onboard_locating')}</p>
              <p style={S.locSub}>{t('onboard_locating_sub')}</p>
              <button style={S.ctaSkip} onClick={() => setStage('denied')}>{t('onboard_search_trouble')}</button>
            </motion.div>
          )}

          {(stage === 'search' || stage === 'denied') && (
            <SearchStage 
              key="search" 
              t={t} 
              query={query} 
              results={results} 
              hubs={cleanHubs} 
              busy={busy} 
              setQuery={setQuery}
              setResults={setResults}
              onPick={pickHub}
              onBack={() => setStage('pip')}
              onSkip={skip}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SearchStage({ t, query, results, hubs, busy, setQuery, setResults, onPick, onBack, onSkip }) {
  const debRef = useRef(null);

  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debRef.current);
    if (val.length < 2) { setResults([]); return; }
    debRef.current = setTimeout(() => {
      const filtered = hubs.filter(h => h.hub.toLowerCase().includes(val.toLowerCase()));
      setResults(filtered);
    }, 250);
  };

  return (
    <motion.div style={S.card} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
      <div style={S.searchBox}>
        <span style={S.sIcon}>{busy ? '⟳' : '🔎'}</span>
        <input style={S.sInput} value={query} onChange={(e) => handleSearch(e.target.value)} placeholder={t('onboard_search_placeholder')} autoFocus />
      </div>
      <div style={S.hubGrid}>
        {(results.length > 0 ? results : hubs).map((h, i) => (
          <button key={i} style={S.hubChip} onClick={() => onPick(h.hub)}>{h.hub}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:'0.8rem',marginTop:'1rem'}}>
        <button style={S.ctaSkip} onClick={onBack}>{t('onboard_back')}</button>
        <button style={S.ctaSkip} onClick={onSkip}>{t('onboard_skip')} →</button>
      </div>
    </motion.div>
  );
}

const S = {
  overlay:    {position:'fixed',inset:0,zIndex:2000,background:'#030204',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',overflow:'auto'},
  glow1:      {position:'absolute',top:-200,right:-100,width:500,height:500,borderRadius:'50%',background:'#D4AF37',filter:'blur(120px)',opacity:0.06,pointerEvents:'none'},
  glow2:      {position:'absolute',bottom:-100,left:-50,width:400,height:400,borderRadius:'50%',background:'#5B1FA0',filter:'blur(120px)',opacity:0.05,pointerEvents:'none'},
  wrap:       {position:'relative',zIndex:1,width:'100%',maxWidth:420,display:'flex',flexDirection:'column',alignItems:'center'},
  brand:      {display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.4rem'},
  brandSymbol:{color:'#D4AF37',fontSize:'1.3rem'},
  brandName:  {fontFamily:FONT.display,fontSize:'clamp(2rem,8vw,3rem)',fontWeight:300,letterSpacing:'0.55em',color:'#D4AF37',textShadow:'0 0 60px rgba(212,175,55,0.4)'},
  tagline:    {fontFamily:FONT.mono,fontSize:'clamp(0.35rem,1.6vw,0.46rem)',letterSpacing:'0.28em',color:'rgba(212,175,55,0.45)',marginBottom:'1.8rem',textAlign:'center'},
  card:       {width:'100%',background:'rgba(18,14,24,0.85)',border:'1px solid rgba(212,175,55,0.18)',borderRadius:16,padding:'clamp(1.4rem,5vw,2rem)',backdropFilter:'blur(20px)',boxShadow:'0 24px 60px rgba(0,0,0,0.7)'},
  centred:    {display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:'0.8rem'},
  pipCenter:  {textAlign:'center',marginBottom:'1.6rem'},
  pipEmoji:   {fontSize:'clamp(2rem,6vw,2.8rem)',marginBottom:'0.6rem',display:'block'},
  pipTitle:   {fontFamily:FONT.display,fontSize:'clamp(1.3rem,4vw,1.7rem)',fontWeight:300,color:COLOR.textPrimary,margin:'0 0 0.4rem'},
  pipSub:     {fontFamily:FONT.mono,fontSize:'clamp(0.4rem,1.8vw,0.48rem)',letterSpacing:'0.12em',color:COLOR.textMuted},
  ctaStack:   {display:'flex',flexDirection:'column',gap:'0.7rem'},
  ctaPrimary: {width:'100%',padding:'clamp(0.75rem,3vw,0.95rem)',background:'linear-gradient(135deg,#FFF2A8,#D4AF37)',border:'none',borderRadius:10,fontFamily:FONT.mono,fontSize:'clamp(0.48rem,2vw,0.56rem)',letterSpacing:'0.18em',fontWeight:700,color:'#000',cursor:'pointer'},
  ctaSecondary:{width:'100%',padding:'clamp(0.7rem,3vw,0.9rem)',background:'transparent',border:'1px solid rgba(212,175,55,0.28)',borderRadius:10,fontFamily:FONT.mono,fontSize:'clamp(0.46rem,2vw,0.54rem)',letterSpacing:'0.16em',color:'rgba(212,175,55,0.85)',cursor:'pointer',transition:'border-color 0.2s'},
  ctaSkip:    {background:'none',border:'none',fontFamily:FONT.mono,fontSize:'clamp(0.4rem,1.8vw,0.46rem)',letterSpacing:'0.12em',color:'rgba(255,248,220,0.28)',cursor:'pointer',textAlign:'center',padding:'0.4rem',transition:'color 0.2s'},
  ring:       {width:44,height:44,border:'2px solid rgba(212,175,55,0.15)',borderTop:'2px solid #D4AF37',borderRadius:'50%'},
  locLabel:   {fontFamily:FONT.display,fontSize:'clamp(1rem,3vw,1.2rem)',color:COLOR.textPrimary},
  locSub:     {fontFamily:FONT.mono,fontSize:'0.44rem',letterSpacing:'0.1em',color:COLOR.textMuted},
  searchBox:  {display:'flex',alignItems:'center',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(212,175,55,0.22)',borderRadius:10,overflow:'hidden',marginBottom:'0.75rem'},
  sIcon:      {padding:'0 0.8rem',color:'#D4AF37',fontSize:'0.95rem',flexShrink:0},
  sInput:     {flex:1,padding:'clamp(0.65rem,2.5vw,0.85rem) 0.5rem',background:'transparent',border:'none',outline:'none',fontFamily:FONT.body,fontSize:'clamp(0.85rem,3vw,1rem)',color:COLOR.textPrimary,minWidth:0},
  hubGrid:    {display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'0.4rem',maxHeight:'40vh',overflowY:'auto',paddingRight:'0.2rem'},
  hubChip:    {padding:'clamp(0.5rem,2vw,0.68rem)',background:'rgba(212,175,55,0.04)',border:'1px solid rgba(212,175,55,0.13)',borderRadius:7,fontFamily:FONT.body,fontSize:'clamp(0.78rem,2.5vw,0.85rem)',fontWeight:300,color:'rgba(255,248,220,0.75)',cursor:'pointer',transition:'all 0.18s',textAlign:'center'},
};