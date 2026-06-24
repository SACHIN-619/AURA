// BookingSuccess — every field computed from the ACTUAL booking just made.
// No hardcoded "~25 min" or "Jubilee Hills" — distance/route come from the
// real salon coordinates + user location; date/time come from what the user
// actually selected in the form.
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';

function haversineKm(lat1,lon1,lat2,lon2){
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Rough driving-time estimate: ~25 km/h average city speed in Hyderabad traffic
function estimateMinutes(km){ return Math.max(5, Math.round((km/25)*60)); }

export default function BookingSuccess({salonName,hub,bookingDate,bookingSlot,userLocation,salonCoords,viaWhatsApp,onClose}) {
  // Real route distance/time — only shown if we actually have both coordinates
  let routeText = hub ? `Route to ${hub}` : 'Route details pending';
  if(userLocation && salonCoords){
    const km = haversineKm(userLocation.lat,userLocation.lon,salonCoords.lat,salonCoords.lon);
    const mins = estimateMinutes(km);
    routeText = `${km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km'} · ~${mins} min drive`;
  } else if(!userLocation){
    routeText = 'Enable location for live route estimate';
  }

  // Real selected date — formatted, not "today" by default
  let dateText = 'Date not set';
  if(bookingDate){
    const d = new Date(bookingDate+'T00:00:00');
    dateText = d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  }

  const timeText = bookingSlot || 'Flexible / not set';

  return (
    <motion.div style={{position:'fixed',inset:0,zIndex:950,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <div style={{position:'absolute',inset:0,background:'rgba(3,2,4,0.92)',backdropFilter:'blur(16px)'}} onClick={onClose}/>
      <motion.div style={{position:'relative',width:'100%',maxWidth:420,background:'rgba(13,10,19,0.97)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:20,padding:'clamp(1.4rem,6vw,2.5rem) clamp(1.2rem,5vw,2rem)',boxShadow:'0 40px 100px rgba(0,0,0,0.9)',textAlign:'center'}}
        initial={{scale:0.85,opacity:0,y:40}} animate={{scale:1,opacity:1,y:0}} transition={{type:'spring',stiffness:180,damping:20}}>
        <motion.div style={{fontSize:'3.5rem',color:viaWhatsApp?'#25D366':COLOR.gold,textShadow:viaWhatsApp?'0 0 40px rgba(37,211,102,0.4)':'0 0 40px rgba(212,175,55,0.5)',marginBottom:'1rem'}}
          initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:260,damping:18,delay:0.2}}>{viaWhatsApp?'📱':'✦'}</motion.div>
        <h2 style={{fontFamily:FONT.display,fontSize:'2.2rem',fontWeight:300,color:COLOR.textPrimary,margin:'0 0 0.4rem'}}>
          {viaWhatsApp ? 'WhatsApp opened.' : 'Request sent.'}
        </h2>
        <p style={{fontFamily:FONT.mono,fontSize:'0.47rem',letterSpacing:'0.17em',color:COLOR.textMuted,marginBottom:'1.8rem'}}>{salonName||'Your salon'} · {hub||'Hyderabad'}</p>
        <div className="booking-success-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1.8rem'}}>
          {[
            ['🗺','Route',routeText],
            ['📅','Date',dateText],
            ['⏰','Time slot',timeText],
            viaWhatsApp
              ? ['📱','Next step','Send the message in WhatsApp']
              : ['✉','Next step','We log requests — reply time varies'],
          ].map(([icon,label,val])=>(
            <div key={label} style={{display:'flex',alignItems:'flex-start',gap:'0.6rem',padding:'0.75rem 0.8rem',background:'rgba(212,175,55,0.04)',border:'1px solid rgba(212,175,55,0.12)',borderRadius:8,textAlign:'left'}}>
              <span style={{fontSize:'1.1rem',flexShrink:0,marginTop:1}}>{icon}</span>
              <div>
                <div style={{fontFamily:FONT.mono,fontSize:'0.39rem',letterSpacing:'0.13em',color:COLOR.textGhost,marginBottom:'0.18rem'}}>{label}</div>
                <div style={{fontFamily:FONT.body,fontSize:'0.76rem',color:COLOR.textPrimary,fontWeight:300}}>{val}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{fontFamily:FONT.mono,fontSize:'0.4rem',letterSpacing:'0.08em',color:'rgba(255,248,220,0.32)',lineHeight:1.7,marginBottom:'1.4rem'}}>
          {viaWhatsApp
            ? "Your message is ready in a new WhatsApp tab — nothing is sent until you hit send there. This is a direct chat with the salon, not something AURA manages."
            : "This is a request, not a confirmed booking. We have no automated email/SMS system live yet, so reply times depend on whether our team can reach the salon — treat this as best-effort for now."}
        </p>
        <motion.button style={{width:'100%',padding:'0.85rem',background:viaWhatsApp?'linear-gradient(135deg,#25D366,#1DA851)':'linear-gradient(135deg,#FFF2A8,#D4AF37)',border:'none',borderRadius:8,fontFamily:FONT.mono,fontSize:'0.52rem',letterSpacing:'0.22em',fontWeight:700,color:viaWhatsApp?'#fff':'#000',cursor:'pointer'}}
          onClick={onClose} whileHover={{filter:'brightness(1.08)'}} whileTap={{scale:0.97}}>GOT IT</motion.button>
      </motion.div>
    </motion.div>
  );
}
