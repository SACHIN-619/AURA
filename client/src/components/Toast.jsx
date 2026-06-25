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
          initial={{y:-40,opacity:0,x:'-50%'}} animate={{y:0,opacity:1,x:'-50%'}} exit={{y:-40,opacity:0,x:'-50%'}}
          transition={{type:'spring',stiffness:200,damping:22}}
          style={{position:'fixed',top:'6rem',left:'50%',zIndex:9999,display:'flex',alignItems:'center',gap:'0.7rem',padding:'1rem 1.5rem',background:'rgba(18,14,24,0.95)',border:`1px solid ${C[toast.variant]||C.success}60`,borderRadius:12,backdropFilter:'blur(22px)',fontFamily:FONT.body,fontSize:'0.9rem',color:C[toast.variant]||C.success,width:'90%',maxWidth:400,boxShadow:'0 12px 40px rgba(0,0,0,0.6)'}}>
          <span style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:C[toast.variant]||C.success,boxShadow:`0 0 8px ${C[toast.variant]||C.success}`}}/>
          <span style={{flex:1}}>{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
