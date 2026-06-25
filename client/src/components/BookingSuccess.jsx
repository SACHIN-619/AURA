import { motion } from 'framer-motion';
import { COLOR, FONT } from '../utils/tokens';

export default function BookingSuccess({ 
  successData, // Contains pre-translated title, subtitles, metrics, and strings from your 4-layer AI model stack
  viaWhatsApp, 
  onClose 
}) {
  const {
    title = "",
    subtitle = "",
    meta_location = "",
    label_route = "Route",
    val_route = "",
    label_date = "Date",
    val_date = "",
    label_slot = "Time Slot",
    val_slot = "",
    label_next = "Next Step",
    val_next = "",
    footer_notes = "",
    btn_action = "GOT IT"
  } = successData || {};

  const summaryGrid = [
    { icon: '🗺', label: label_route, val: val_route },
    { icon: '📅', label: label_date, val: val_date },
    { icon: '⏰', label: label_slot, val: val_slot },
    { icon: viaWhatsApp ? '📱' : '✉', label: label_next, val: val_next, fullWidth: true },
  ];

  return (
    <motion.div style={S.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.backdrop} onClick={onClose} />
      
      <motion.div style={S.card} initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}>
        <div style={{ fontSize: '3.5rem', color: viaWhatsApp ? '#25D366' : COLOR.gold, marginBottom: '1rem' }}>
          {viaWhatsApp ? '📱' : '✦'}
        </div>

        <h2 style={S.title}>{title}</h2>
        {subtitle && <p style={S.subtitle}>{subtitle}</p>}
        <p style={S.meta}>{meta_location}</p>

        <div style={S.grid}>
          {summaryGrid.map((item) => (
            <div key={item.label} style={{ ...S.gridItem, gridColumn: item.fullWidth ? 'span 2' : 'span 1' }}>
              <span style={S.icon}>{item.icon}</span>
              <div>
                <div style={S.label}>{item.label}</div>
                <div style={S.value}>{item.val}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={S.footer}>{footer_notes}</p>

        <motion.button 
          style={{ ...S.btn, background: viaWhatsApp ? 'linear-gradient(135deg,#25D366,#1DA851)' : 'linear-gradient(135deg,#FFF2A8,#D4AF37)', color: viaWhatsApp ? '#fff' : '#000' }}
          onClick={onClose} 
          whileHover={{ filter: 'brightness(1.08)' }} 
          whileTap={{ scale: 0.97 }}
        >
          {btn_action}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(3,2,4,0.92)', backdropFilter: 'blur(16px)' },
  card: { position: 'relative', width: '100%', maxWidth: 440, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, padding: '2rem 1.5rem', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', textAlign: 'center' },
  title: { fontFamily: FONT.display, fontSize: '2.2rem', fontWeight: 300, color: COLOR.textPrimary, margin: '0 0 0.4rem' },
  subtitle: { fontFamily: FONT.body, fontSize: '1rem', color: COLOR.gold, margin: '0 0 1rem' },
  meta: { fontFamily: FONT.mono, fontSize: '0.47rem', letterSpacing: '0.17em', color: COLOR.textMuted, marginBottom: '1.8rem' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.8rem' },
  gridItem: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 0.8rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 8, textAlign: 'left' },
  icon: { fontSize: '1.1rem', flexShrink: 0, marginTop: 1 },
  label: { fontFamily: FONT.mono, fontSize: '0.39rem', letterSpacing: '0.13em', color: COLOR.textGhost, marginBottom: '0.18rem' },
  value: { fontFamily: FONT.body, fontSize: '0.76rem', color: COLOR.textPrimary, fontWeight: 300 },
  footer: { fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.08em', color: 'rgba(255,248,220,0.32)', lineHeight: 1.7, marginBottom: '1.4rem' },
  btn: { width: '100%', padding: '0.85rem', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.52rem', letterSpacing: '0.22em', fontWeight: 700, cursor: 'pointer' }
};
////////////// old code architure for ref  //////////////////
// // BookingSuccess — every field computed from the ACTUAL booking just made.
// // No hardcoded "~25 min" or "Jubilee Hills" — distance/route come from the
// // real salon coordinates + user location; date/time come from what the user
// // actually selected in the form.
// import { motion } from 'framer-motion';
// import { useLanguage } from '../i18n/LanguageContext.jsx';
// import { COLOR, FONT } from '../utils/tokens';

// function haversineKm(lat1, lon1, lat2, lon2) {
//   const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
//   const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// function estimateMinutes(km) { return Math.max(5, Math.round((km / 25) * 60)); }

// export default function BookingSuccess({ salonName, hub, bookingDate, bookingSlot, userLocation, salonCoords, viaWhatsApp, onClose }) {
//   const { t } = useLanguage();

//   let routeText = hub ? `Route to ${hub}` : 'Route details pending';
//   if (userLocation && salonCoords) {
//     const km = haversineKm(userLocation.lat, userLocation.lon, salonCoords.lat, salonCoords.lon);
//     const mins = estimateMinutes(km);
//     routeText = `${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'} · ~${mins} min drive`;
//   } else if (!userLocation) {
//     routeText = 'Enable location for live route estimate';
//   }

//   let dateText = 'Date not set';
//   if (bookingDate) {
//     const d = new Date(bookingDate + 'T00:00:00');
//     dateText = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
//   }

//   const timeText = bookingSlot || 'Flexible / not set';

//   const summaryGrid = [
//     { icon: '🗺', label: 'Route', val: routeText, fullWidth: false },
//     { icon: '📅', label: 'Date', val: dateText, fullWidth: false },
//     { icon: '⏰', label: 'Time slot', val: timeText, fullWidth: false },
//     { 
//       icon: viaWhatsApp ? '📱' : '✉', 
//       label: 'Next step', 
//       val: viaWhatsApp ? 'Send the message in WhatsApp' : 'We log requests — reply time varies',
//       fullWidth: true 
//     },
//   ];

//   return (
//     <motion.div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//       <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,2,4,0.92)', backdropFilter: 'blur(16px)' }} onClick={onClose} />
      
//       <motion.div 
//         style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, padding: 'clamp(1.4rem, 6vw, 2.5rem) clamp(1.2rem, 5vw, 2rem)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', textAlign: 'center' }}
//         initial={{ scale: 0.85, opacity: 0, y: 40 }} 
//         animate={{ scale: 1, opacity: 1, y: 0 }} 
//         transition={{ type: 'spring', stiffness: 180, damping: 20 }}
//       >
//         <motion.div 
//           style={{ fontSize: '3.5rem', color: viaWhatsApp ? '#25D366' : COLOR.gold, textShadow: viaWhatsApp ? '0 0 40px rgba(37,211,102,0.4)' : '0 0 40px rgba(212,175,55,0.5)', marginBottom: '1rem' }}
//           initial={{ scale: 0 }} 
//           animate={{ scale: 1 }} 
//           transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
//         >
//           {viaWhatsApp ? '📱' : '✦'}
//         </motion.div>

//         <h2 style={{ fontFamily: FONT.display, fontSize: '2.2rem', fontWeight: 300, color: COLOR.textPrimary, margin: '0 0 0.4rem' }}>
//           {viaWhatsApp ? 'WhatsApp opened.' : 'Request sent.'}
//         </h2>
        
//         <p style={{ fontFamily: FONT.mono, fontSize: '0.47rem', letterSpacing: '0.17em', color: COLOR.textMuted, marginBottom: '1.8rem' }}>
//           {salonName || 'Your salon'} · {hub || 'Hyderabad'}
//         </p>

//         <div className="booking-success-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.8rem' }}>
//           {summaryGrid.map((item) => (
//             <div 
//               key={item.label} 
//               style={{ 
//                 display: 'flex', 
//                 alignItems: 'flex-start', 
//                 gap: '0.6rem', 
//                 padding: '0.75rem 0.8rem', 
//                 background: 'rgba(212,175,55,0.04)', 
//                 border: '1px solid rgba(212,175,55,0.12)', 
//                 borderRadius: 8, 
//                 textAlign: 'left',
//                 gridColumn: item.fullWidth ? 'span 2' : 'span 1'
//               }}
//             >
//               <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
//               <div>
//                 <div style={{ fontFamily: FONT.mono, fontSize: '0.39rem', letterSpacing: '0.13em', color: COLOR.textGhost, marginBottom: '0.18rem' }}>{item.label}</div>
//                 <div style={{ fontFamily: FONT.body, fontSize: '0.76rem', color: COLOR.textPrimary, fontWeight: 300 }}>{item.val}</div>
//               </div>
//             </div>
//           ))}
//         </div>

//         <p style={{ fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.08em', color: 'rgba(255,248,220,0.32)', lineHeight: 1.7, marginBottom: '1.4rem' }}>
//           {viaWhatsApp
//             ? "Your message is ready in a new WhatsApp tab — nothing is sent until you hit send there. This is a direct chat with the salon, not something AURA manages."
//             : "This is a request, not a confirmed booking. We have no automated email/SMS system live yet, so reply times depend on whether our team can reach the salon — treat this as best-effort for now."}
//         </p>

//         <motion.button 
//           style={{ width: '100%', padding: '0.85rem', background: viaWhatsApp ? 'linear-gradient(135deg,#25D366,#1DA851)' : 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.52rem', letterSpacing: '0.22em', fontWeight: 700, color: viaWhatsApp ? '#fff' : '#000', cursor: 'pointer' }}
//           onClick={onClose} 
//           whileHover={{ filter: 'brightness(1.08)' }} 
//           whileTap={{ scale: 0.97 }}
//         >
//           GOT IT
//         </motion.button>
//       </motion.div>
//     </motion.div>
//   );
// }

