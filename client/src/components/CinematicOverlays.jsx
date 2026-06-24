import { motion } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';

function ScissorSVG({size=300}) {
  return (
    <svg viewBox="0 0 1000 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:size,height:'auto',display:'block'}} aria-hidden="true">
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFEFA6"/><stop offset="35%" stopColor="#D4AF37"/>
          <stop offset="70%" stopColor="#9E7817"/><stop offset="100%" stopColor="#FFF5C2"/>
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <style>{`
        @keyframes ub{0%{transform:rotate(0);}35%{transform:rotate(-11deg);}65%{transform:rotate(-11deg);}100%{transform:rotate(0);}}
        @keyframes lb{0%{transform:rotate(0);}35%{transform:rotate(11deg);}65%{transform:rotate(11deg);}100%{transform:rotate(0);}}
        @keyframes lp{0%,100%{opacity:.4;}50%{opacity:1;filter:drop-shadow(0 0 18px #D4AF37);}}
        .ub{animation:ub 3s infinite cubic-bezier(.25,1,.5,1);transform-origin:500px 300px;}
        .lb{animation:lb 3s infinite cubic-bezier(.25,1,.5,1);transform-origin:500px 300px;}
        .ll{animation:lp 3s infinite ease-in-out;}
      `}</style>
      <g className="ub">
        <path d="M500 300 Q560 330 780 435" fill="none" stroke="url(#sg)" strokeWidth="18" strokeLinecap="round"/>
        <path d="M500 300 Q420 300 330 200 C270 130 210 180 210 240 C210 320 280 340 330 280 Q420 300 500 300Z" fill="url(#sg)" opacity=".9"/>
        <circle cx="270" cy="235" r="28" fill="#030204" stroke="url(#sg)" strokeWidth="2"/>
      </g>
      <g className="lb">
        <path d="M500 300 Q560 270 780 165" fill="none" stroke="url(#sg)" strokeWidth="18" strokeLinecap="round"/>
        <path d="M500 300 Q420 300 340 370 C290 420 220 400 180 470 C140 540 240 510 270 470 C310 420 380 400 500 300Z" fill="url(#sg)" opacity=".9"/>
        <circle cx="230" cy="435" r="28" fill="#030204" stroke="url(#sg)" strokeWidth="2"/>
      </g>
      <line className="ll" x1="450" y1="285" x2="880" y2="135" stroke="#FFF2A8" strokeWidth="1.5" filter="url(#glow)"/>
      <line className="ll" x1="450" y1="315" x2="880" y2="465" stroke="#FFF2A8" strokeWidth="1.5" filter="url(#glow)"/>
      <circle cx="500" cy="300" r="14" fill="url(#sg)" stroke="#3E2D00" strokeWidth="1"/>
      <line x1="493" y1="294" x2="507" y2="306" stroke="#3E2D00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IntroOverlay() {
  return (
    <motion.div style={{position:'fixed',inset:0,zIndex:2000,background:'#030204',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}
      exit={{opacity:0,transition:{duration:0.8}}}>
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{duration:0.7}}>
        <ScissorSVG size={300}/>
      </motion.div>
      <motion.h1 style={{fontFamily:FONT.display,fontSize:'clamp(2.5rem,8vw,5rem)',fontWeight:300,letterSpacing:'0.55em',color:COLOR.gold,textShadow:'0 0 60px rgba(212,175,55,0.4)',margin:0}}
        initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3,duration:0.8}}>
        AURA
      </motion.h1>
      <motion.p style={{fontFamily:FONT.mono,fontSize:'clamp(0.4rem,1.8vw,0.55rem)',letterSpacing:'0.35em',color:COLOR.textMuted}}
        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.7}}>
        HYDERABAD LUXURY GROOMING MARKETPLACE
      </motion.p>
      <motion.div style={{height:1,background:'linear-gradient(90deg,transparent,#D4AF37,transparent)',marginTop:'0.5rem'}}
        initial={{width:0}} animate={{width:240}} transition={{delay:0.5,duration:1}}/>
    </motion.div>
  );
}

export function HubLoader({hubName,isVisible}) {
  if(!isVisible) return null;
  return (
    <motion.div style={{position:'fixed',inset:0,zIndex:600,background:'rgba(3,2,4,0.92)',backdropFilter:'blur(16px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.2rem'}}
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <ScissorSVG size={200}/>
      <p style={{fontFamily:FONT.display,fontSize:'clamp(1rem,3vw,1.6rem)',fontWeight:300,letterSpacing:'0.28em',color:COLOR.gold}}>{(hubName||'').toUpperCase()}</p>
      <p style={{fontFamily:FONT.mono,fontSize:'0.48rem',letterSpacing:'0.25em',color:COLOR.textMuted}}>SYNCING LIVE DATA</p>
      <div style={{display:'flex',gap:6}}>
        {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:COLOR.gold,animation:`ldpulse 1.3s ease-in-out ${i*0.22}s infinite`}}/>)}
      </div>
    </motion.div>
  );
}
