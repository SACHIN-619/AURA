import { motion, AnimatePresence } from 'framer-motion';
import { useAura } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';
const C = {success:'#4CAF50',error:'#EF5350',info:'#64B5F6'};
export default function Toast() {
  const {toast} = useAura();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div key="toast"
          initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:80,opacity:0}}
          transition={{type:'spring',stiffness:200,damping:22}}
          style={{position:'fixed',bottom:'2rem',right:'2rem',zIndex:700,display:'flex',alignItems:'center',gap:'0.7rem',padding:'0.85rem 1.3rem',background:'rgba(18,14,24,0.92)',border:`1px solid ${C[toast.variant]||C.success}40`,borderRadius:8,backdropFilter:'blur(22px)',fontFamily:FONT.mono,fontSize:'0.5rem',letterSpacing:'0.14em',color:C[toast.variant]||C.success,maxWidth:360,boxShadow:'0 8px 30px rgba(0,0,0,0.5)'}}>
          <span style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:C[toast.variant]||C.success,boxShadow:`0 0 6px ${C[toast.variant]||C.success}`}}/>
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
