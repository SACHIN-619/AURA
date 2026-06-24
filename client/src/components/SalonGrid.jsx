import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import SalonCard, { cardVariants } from './SalonCard';
import { COLOR, FONT } from '../utils/tokens';

export default function SalonGrid() {
  const {salons,allFilteredSalons,loading,error,activeHub,page,setPage,totalPages,aiMatchIds} = useAura();

  if(loading) return <SkeletonGrid/>;

  if(!activeHub&&!loading&&salons.length===0) return (
    <div style={S.empty}>
      <div style={S.emptyIcon}>◈</div>
      <div style={S.emptyTitle}>Select a hub to begin</div>
      <div style={S.emptySub}>Choose an area from the sidebar to discover salons near you</div>
    </div>
  );

  if(activeHub&&!loading&&salons.length===0) return (
    <div style={S.empty}>
      <div style={S.emptyIcon}>✦</div>
      <div style={S.emptyTitle}>No salons found for {activeHub}</div>
      <div style={S.emptySub}>OSM has limited data here yet — try a nearby hub, or check back after the next sync.</div>
    </div>
  );

  return (
    <>
      <motion.div className="salon-grid" style={S.grid}
        initial="hidden" animate="show"
        variants={{show:{transition:{staggerChildren:0.06}}}}>
        <AnimatePresence mode="popLayout">
          {salons.map((salon,i)=>(
            <SalonCard key={salon._id||salon.osmId||i} salon={salon} idx={(page-1)*12+i} isMatch={!!(aiMatchIds?.includes(salon._id))}/>
          ))}
        </AnimatePresence>
      </motion.div>

      {totalPages>1&&(
        <div style={S.pag}>
          <PBtn label="← PREV" disabled={page===1} onClick={()=>{setPage(p=>p-1);window.scrollTo({top:0,behavior:'smooth'});}}/>
          {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
            <PBtn key={p} label={String(p)} active={p===page} onClick={()=>{setPage(p);window.scrollTo({top:0,behavior:'smooth'});}}/>
          ))}
          <PBtn label="NEXT →" disabled={page===totalPages} onClick={()=>{setPage(p=>p+1);window.scrollTo({top:0,behavior:'smooth'});}}/>
        </div>
      )}
      {allFilteredSalons.length>12&&(
        <div style={S.pageInfo}>Showing {(page-1)*12+1}–{Math.min(page*12,allFilteredSalons.length)} of {allFilteredSalons.length} salons</div>
      )}
    </>
  );
}

function PBtn({label,onClick,disabled,active}){
  return <button onClick={onClick} disabled={disabled} style={{padding:'0.48rem 0.9rem',background:active?'rgba(212,175,55,0.1)':'transparent',border:`1px solid ${active?'rgba(212,175,55,0.5)':COLOR.edge}`,borderRadius:8,fontFamily:FONT.body,fontSize:'0.78rem',fontWeight:500,color:active?COLOR.gold:COLOR.textMuted,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.35:1,transition:'all 0.2s'}}>{label}</button>;
}

function SkeletonGrid(){
  return (
    <div className="salon-grid" style={S.grid}>
      {Array.from({length:6},(_,i)=>(
        <div key={i} style={{background:COLOR.glass,border:`1px solid ${COLOR.edge2}`,borderRadius:14,overflow:'hidden',opacity:0,animation:`fadein 0.5s ${i*0.07}s forwards`}}>
          <div style={{height:198,...shimmer}}/>
          <div style={{padding:'1.15rem 1.25rem 1.2rem'}}>
            <div style={{width:'70%',height:18,marginBottom:12,borderRadius:5,...shimmer}}/>
            <div style={{width:'50%',height:11,marginBottom:18,borderRadius:4,...shimmer}}/>
            <div style={{width:'40%',height:11,marginBottom:20,borderRadius:4,...shimmer}}/>
            <div style={{display:'flex',gap:8,marginBottom:22}}>
              <div style={{width:70,height:24,borderRadius:20,...shimmer}}/>
              <div style={{width:90,height:24,borderRadius:20,...shimmer}}/>
            </div>
            <div style={{height:38,borderRadius:9,...shimmer}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

const shimmer = {
  background:'linear-gradient(90deg,rgba(212,175,55,0.04) 25%,rgba(212,175,55,0.1) 50%,rgba(212,175,55,0.04) 75%)',
  backgroundSize:'200% 100%',
  animation:'shimmer 1.6s ease-in-out infinite',
};

const S={
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(285px,1fr))',gap:'1.3rem'},
  empty:{display:'flex',flexDirection:'column',alignItems:'center',padding:'5.5rem 2rem',gap:'0.9rem',gridColumn:'1/-1'},
  emptyIcon:{width:56,height:56,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(212,175,55,0.06)',border:`1px solid ${COLOR.edge}`,fontFamily:FONT.display,fontSize:'1.6rem',color:'rgba(212,175,55,0.55)',marginBottom:'0.3rem'},
  emptyTitle:{fontFamily:FONT.display,fontSize:'1.6rem',fontWeight:400,fontStyle:'italic',color:COLOR.textPrimary},
  emptySub:{fontFamily:FONT.body,fontSize:'0.82rem',color:COLOR.textMuted,textAlign:'center',maxWidth:380,lineHeight:1.6},
  pag:{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.45rem',marginTop:'2rem',flexWrap:'wrap'},
  pageInfo:{textAlign:'center',fontFamily:FONT.mono,fontSize:'0.45rem',letterSpacing:'0.15em',color:'rgba(212,175,55,0.4)',marginTop:'0.75rem'},
};
