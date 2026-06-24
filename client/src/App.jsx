import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuraProvider, useAura } from './context/AuraContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlassSidebar from './components/GlassSidebar';
import SalonGrid from './components/SalonGrid';
import AiBar from './components/AiBar';
import Toast from './components/Toast';
import LocationOnboarding from './components/LocationOnboarding';
import AuraMirror from './components/AuraMirror';
import LanguageSelector from './components/LanguageSelector';
import AuthModal from './components/AuthModal';
import MyAccount from './components/MyAccount';
import { IntroOverlay, HubLoader } from './components/CinematicOverlays';
import { COLOR, FONT, SPRING } from './utils/tokens';

function AccountButton() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aura_user') || 'null'); } catch { return null; }
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const logout = (e) => {
    e.stopPropagation();
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    setUser(null);
    setShowAccount(false);
  };

  return (
    <>
      {user ? (
        <div className="account-wrap" style={S.accountWrap}>
          <button onClick={() => setShowAccount(true)} style={S.accountBtn} title="View my account">
            <span style={S.accountDot} /> {user.name.split(' ')[0]}
          </button>
          <button onClick={logout} style={S.logoutMini} title="Log out">⏻</button>
        </div>
      ) : (
        <div className="account-wrap" style={S.accountWrap}>
          <button onClick={() => setShowAuth(true)} style={S.accountBtn}>
            Log in
          </button>
        </div>
      )}
      <AnimatePresence>
        {showAuth && (
          <AuthModal key="auth" onClose={() => setShowAuth(false)} onAuthed={(u) => setUser(u)} />
        )}
        {showAccount && (
          <MyAccount key="account" onClose={() => setShowAccount(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function PageHeader() {
  const {activeHub,allFilteredSalons,loading,syncing,aiReply,stats} = useAura();
  const title=activeHub||'Hyderabad';
  const parts=title.split(' '),last=parts.pop(),rest=parts.join(' ');
  return (
    <motion.div style={S.header} initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} transition={{...SPRING.gentle,delay:0.3}}>
      <div>
        <h1 style={S.title}>{rest}{rest?' ':''}<span style={{color:COLOR.gold}}>{last}</span></h1>
        <p style={S.sub}>PREMIUM LUXURY SALONS · LIVE OPENSTREETMAP DATA</p>
        {aiReply&&<motion.p initial={{opacity:0}} animate={{opacity:1}} style={S.aiReply}>✦ {aiReply}</motion.p>}
      </div>
      <div style={S.badges}>
        <div style={S.liveBadge}><span style={S.dot}/>LIVE OSM</div>
        {!loading&&!syncing&&allFilteredSalons.length>0&&<span style={S.countBadge}>{allFilteredSalons.length} SALONS</span>}
        {/* avgRating removed — no real rating data source exists yet */}
      </div>
    </motion.div>
  );
}

function AppShell({showApp}) {
  const {syncing,activeHub,onboarded,loadHubList} = useAura();
  const [onbDone,setOnbDone] = useState(false);
  const [showMirror,setShowMirror] = useState(false);

  useEffect(()=>{ if(showApp) loadHubList(); },[showApp]); // eslint-disable-line

  const showOnboarding = showApp && !onboarded && !onbDone;

  return (
    <>
      <HubLoader hubName={activeHub} isVisible={syncing}/>
      <AnimatePresence>
        {showOnboarding&&<LocationOnboarding key="onb" onComplete={()=>setOnbDone(true)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showMirror&&<AuraMirror key="mir" onClose={()=>setShowMirror(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {showApp&&(onboarded||onbDone)&&(
          <motion.div key="shell" style={S.shell} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.7}}>
            <div style={S.orb1}/><div style={S.orb2}/><div style={S.grain}/>
            <ErrorBoundary><GlassSidebar/></ErrorBoundary>
            <main className="main-content" style={S.main}>
              <PageHeader/>
              <AiBar/>
              <ErrorBoundary><SalonGrid/></ErrorBoundary>
            </main>
            <motion.button onClick={()=>setShowMirror(true)} style={{...S.mirrorBtn,x:'-50%'}}
              initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:1.2,...SPRING.gentle}}
              whileHover={{scale:1.05}} whileTap={{scale:0.97}}
              title="AURA Mirror — AI style analysis">
              <span style={{fontSize:'1.1rem'}}>◈</span>
              <span style={{fontFamily:FONT.mono,fontSize:'0.47rem',letterSpacing:'0.2em'}}>MIRROR</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast/>
      <LanguageSelector/>
    </>
  );
}

export default function App() {
  const [showIntro,setShowIntro] = useState(true);
  const [showApp,setShowApp] = useState(false);

  useEffect(()=>{
    const t1=setTimeout(()=>setShowIntro(false),3000);
    const t2=setTimeout(()=>setShowApp(true),3200);
    return ()=>{clearTimeout(t1);clearTimeout(t2);};
  },[]);

  return (
    <div style={{background:COLOR.voidDeep,minHeight:'100vh'}}>
      <AuraProvider>
        <AnimatePresence>{showIntro&&<IntroOverlay key="intro"/>}</AnimatePresence>
        <AppShell showApp={showApp}/>
      </AuraProvider>
    </div>
  );
}

const S={
  shell:{display:'flex',minHeight:'100vh',position:'relative',zIndex:1},
  main:{marginLeft:280,flex:1,padding:'2.5rem 2rem 6rem',minHeight:'100vh'},
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.4rem',flexWrap:'wrap',gap:'1rem'},
  title:{fontFamily:FONT.display,fontSize:'clamp(1.9rem,4vw,3rem)',fontWeight:300,fontStyle:'italic',color:COLOR.textPrimary,lineHeight:1,letterSpacing:'0.02em'},
  sub:{fontFamily:FONT.mono,fontSize:'0.5rem',letterSpacing:'0.3em',color:COLOR.textMuted,marginTop:'0.55rem'},
  aiReply:{fontFamily:FONT.display,fontSize:'0.88rem',fontStyle:'italic',color:COLOR.textMuted,marginTop:'0.45rem',maxWidth:560},
  badges:{display:'flex',alignItems:'center',gap:'0.65rem',paddingTop:'0.35rem',flexWrap:'wrap'},
  liveBadge:{display:'flex',alignItems:'center',gap:'0.42rem',padding:'0.35rem 0.82rem',background:'rgba(212,175,55,0.05)',border:'1px solid rgba(212,175,55,0.2)',borderRadius:20,fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.18em',color:COLOR.gold},
  dot:{display:'inline-block',width:5,height:5,borderRadius:'50%',background:'#4CAF50',boxShadow:'0 0 6px #4CAF50',flexShrink:0},
  countBadge:{display:'inline-block',padding:'0.35rem 0.82rem',background:'rgba(212,175,55,0.03)',border:'1px solid rgba(212,175,55,0.12)',borderRadius:20,fontFamily:FONT.mono,fontSize:'0.46rem',letterSpacing:'0.18em',color:'rgba(212,175,55,0.55)'},
  mirrorBtn:{position:'fixed',bottom:'2rem',left:'50%',zIndex:400,display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.6rem 1.4rem',background:'rgba(18,14,24,0.85)',border:'1px solid rgba(212,175,55,0.35)',borderRadius:30,backdropFilter:'blur(20px)',cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',color:COLOR.gold},
  orb1:{position:'fixed',top:-200,right:-100,width:600,height:600,borderRadius:'50%',background:COLOR.gold,filter:'blur(100px)',opacity:0.04,pointerEvents:'none',zIndex:0},
  orb2:{position:'fixed',bottom:-100,left:200,width:400,height:400,borderRadius:'50%',background:'#5B1FA0',filter:'blur(100px)',opacity:0.025,pointerEvents:'none',zIndex:0},
  grain:{position:'fixed',inset:0,zIndex:0,opacity:0.025,pointerEvents:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:'200px 200px'},
  accountWrap:{position:'fixed',top:'1rem',right:'7.5rem',zIndex:700,display:'flex',alignItems:'center',gap:'0.4rem'},
  accountBtn:{display:'flex',alignItems:'center',gap:'0.35rem',padding:'0.4rem 0.8rem',background:'rgba(18,14,24,0.85)',border:'1px solid rgba(212,175,55,0.25)',borderRadius:20,backdropFilter:'blur(16px)',cursor:'pointer',fontFamily:FONT.body,fontSize:'0.72rem',color:COLOR.textPrimary},
  accountDot:{width:5,height:5,borderRadius:'50%',background:'#4CAF50',boxShadow:'0 0 5px #4CAF50',flexShrink:0},
  logoutMini:{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(18,14,24,0.85)',border:'1px solid rgba(212,175,55,0.25)',borderRadius:'50%',backdropFilter:'blur(16px)',cursor:'pointer',color:COLOR.textGhost,fontSize:'0.7rem'},
};
