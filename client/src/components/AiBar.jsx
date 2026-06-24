import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT } from '../utils/tokens';

export default function AiBar() {
  const {aiSearch,loading,allHubs} = useAura();
  const { t } = useLanguage();
  const [query,setQuery] = useState('');
  const [results,setResults] = useState([]);
  const [showDrop,setShowDrop] = useState(false);
  const [searching,setSearching] = useState(false);
  const debRef = useRef(null);

  const fetchSuggestions = async (q) => {
    if(q.length<2){setResults([]);return;}
    setSearching(true);
    try {
      const r = await fetch(`${API}/api/search/autocomplete?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.results||[]);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const onChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debRef.current);
    if(v.trim().length>=2){ debRef.current=setTimeout(()=>fetchSuggestions(v.trim()),280); setShowDrop(true); }
    else { setResults([]); setShowDrop(false); }
  };

  const submit = () => {
    if(!query.trim()||loading) return;
    setShowDrop(false);
    aiSearch(query.trim());
    setQuery('');
  };

  const selectResult = (r) => {
    setShowDrop(false);
    aiSearch(`Find ${r.name} in ${r.hub}`);
    setQuery('');
  };

  return (
    <div style={{position:'relative',marginBottom:'1.6rem'}}>
      <div style={S.bar}>
        <span style={S.icon}>✦</span>
        <input style={S.input} value={query} onChange={onChange}
          onKeyDown={e=>e.key==='Enter'&&submit()}
          onFocus={()=>query.length>=2&&setShowDrop(true)}
          onBlur={()=>setTimeout(()=>setShowDrop(false),180)}
          placeholder={t('ai_placeholder')}
          autoComplete="off" spellCheck="false"/>
        {searching&&<span style={S.spinner}/>}
        <motion.button style={S.btn} onClick={submit} disabled={loading||!query.trim()} whileHover={{scale:1.02}} whileTap={{scale:0.97}}>
          <span style={S.btnTxt}>{t('ai_ask')}</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {showDrop&&results.length>0&&(
          <motion.div style={S.drop} initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.15}}>
            {results.map((r,i)=>(
              <div key={r._id||i} style={S.item} onMouseDown={()=>selectResult(r)}>
                <div style={{display:'flex',flexDirection:'column',gap:'0.12rem',flex:1,minWidth:0}}>
                  <span style={S.itemName}>{r.name}</span>
                  <span style={S.itemMeta}>{r.hub}{r.suburb?` · ${r.suburb}`:''}</span>
                </div>
                <span style={S.itemRating}>★ {(r.rating||4.5).toFixed(1)}</span>
              </div>
            ))}
            <div style={S.dropFoot}>Press Enter or <span style={{color:COLOR.gold}}>{t('ai_ask')}</span> for full results</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const S = {
  bar:{display:'flex',alignItems:'stretch',background:'rgba(18,14,24,0.65)',border:'1px solid rgba(212,175,55,0.18)',borderRadius:8,backdropFilter:'blur(20px)',overflow:'hidden'},
  icon:{display:'flex',alignItems:'center',padding:'0 0.9rem',color:COLOR.gold,fontSize:'0.95rem',flexShrink:0,borderRight:'1px solid rgba(212,175,55,0.1)'},
  input:{flex:1,padding:'0.85rem 0.9rem',background:'transparent',border:'none',outline:'none',fontFamily:FONT.body,fontSize:'0.85rem',color:COLOR.textPrimary,minWidth:0},
  spinner:{width:14,height:14,border:'1.5px solid rgba(212,175,55,0.2)',borderTop:'1.5px solid #D4AF37',borderRadius:'50%',animation:'spin 0.8s linear infinite',alignSelf:'center',marginRight:8,flexShrink:0},
  btn:{display:'flex',alignItems:'center',padding:'0.7rem 1.2rem',background:'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))',borderLeft:'1px solid rgba(212,175,55,0.15)',cursor:'pointer',border:'none',flexShrink:0},
  btnTxt:{fontFamily:FONT.mono,fontSize:'0.48rem',letterSpacing:'0.2em',color:COLOR.gold},
  drop:{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:50,background:'rgba(13,10,19,0.98)',border:'1px solid rgba(212,175,55,0.2)',borderRadius:8,boxShadow:'0 12px 40px rgba(0,0,0,0.7)',overflow:'hidden'},
  item:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.7rem 1rem',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)'},
  itemName:{fontFamily:FONT.display,fontSize:'0.93rem',fontWeight:300,color:COLOR.textPrimary,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  itemMeta:{fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.1em',color:COLOR.textMuted},
  itemRating:{fontFamily:FONT.mono,fontSize:'0.44rem',color:COLOR.gold,flexShrink:0,paddingLeft:'0.8rem'},
  dropFoot:{padding:'0.5rem 1rem',fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.1em',color:'rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.2)',textAlign:'center'},
};
