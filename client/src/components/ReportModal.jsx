import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';

export default function ReportModal({ salon, onClose }) {
  const { pushToast } = useAura();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const reasons = [
    'Incorrect Address / Location',
    'Prices are outdated',
    'Salon is permanently closed',
    'Incorrect Phone Number / Contact',
    'Fake or Spam Listing',
    'Other'
  ];

  const submitReport = async () => {
    if (!reason) {
      pushToast('Please select a reason', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/reports/${salon._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token') || ''}`
        },
        body: JSON.stringify({ reason, details })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');
      pushToast('Report submitted successfully. Our team will review it.', 'success');
      onClose();
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
        <button style={S.close} onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: FONT.display, fontSize: '1.2rem', color: COLOR.textPrimary, marginBottom: '0.3rem', textAlign: 'center' }}>Report an Issue</h2>
        <p style={{ fontFamily: FONT.mono, fontSize: '0.75rem', color: COLOR.textMuted, marginBottom: '1.5rem', textAlign: 'center' }}>Help us keep {salon.name} accurate.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {reasons.map(r => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontFamily: FONT.body, color: COLOR.textPrimary, fontSize: '0.9rem' }}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={(e) => setReason(e.target.value)} style={{ accentColor: COLOR.gold }} />
              {r}
            </label>
          ))}
        </div>

        <textarea 
          style={S.inp} 
          placeholder="Additional details (optional)..." 
          value={details} 
          onChange={e => setDetails(e.target.value)}
          maxLength={300}
        />

        <motion.button 
          style={{ ...S.btn, opacity: busy ? 0.6 : 1 }} 
          onClick={submitReport} 
          disabled={busy}
          whileHover={busy ? {} : { filter: 'brightness(1.1)' }}
          whileTap={busy ? {} : { scale: 0.98 }}
        >
          {busy ? 'Submitting...' : 'Submit Report'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

const S = {
  ov: { position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  back: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' },
  box: { position: 'relative', width: '100%', maxWidth: 400, background: 'rgba(15,15,15,0.98)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12, padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.9)' },
  close: { position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: COLOR.textMuted, fontSize: '1.2rem', cursor: 'pointer' },
  inp: { width: '100%', height: 80, padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, outline: 'none', fontFamily: FONT.body, fontSize: '0.9rem', color: COLOR.textPrimary, resize: 'none', marginBottom: '1.2rem' },
  btn: { width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #EF5350, #D32F2F)', border: 'none', borderRadius: 6, fontFamily: FONT.mono, fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#fff', cursor: 'pointer' }
};
