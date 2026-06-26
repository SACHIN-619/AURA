// RatingModal — submit a real rating + comment for a salon. Checks
// eligibility (did this email actually book this salon before?) live as
// the user types their email, so they see honestly whether their rating
// will be AuraVerified before they submit.
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { API, useAura } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT } from '../utils/tokens';
import VerifiedBadge from './VerifiedBadge';

export default function RatingModal({ salon, existingReviews = [], onClose, onSubmitted }) {
  const { pushToast, user } = useAura();
  const { t } = useLanguage();
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName]   = useState(user?.name || '');
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState('');
  const [eligibility, setEligibility] = useState(null); // null = unchecked
  const [busy, setBusy] = useState(false);
  const debRef = useRef(null);

  useEffect(() => {
    clearTimeout(debRef.current);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEligibility(null); return; }
    debRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/ratings/eligibility?salonId=${salon._id}&email=${encodeURIComponent(email)}`);
        const d = await r.json();
        setEligibility(d);
        if (d.alreadyRated && d.existingRating) {
          setStars(d.existingRating.stars);
          setComment(d.existingRating.comment || '');
        }
      } catch { setEligibility(null); }
    }, 400);
  }, [email, salon._id]);

  const submit = async () => {
    if (!stars) { pushToast('Please select a star rating', 'error'); return; }
    if (!name.trim() || !email.trim()) { pushToast('Name and email are required', 'error'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/ratings`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token') || ''}`
        },
        body: JSON.stringify({ salonId: salon._id, customerEmail: email, customerName: name, stars, comment }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not submit rating');
      pushToast(d.message || 'Thank you for rating!');
      onSubmitted?.();
    } catch (e) {
      pushToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
        <button style={S.close} onClick={onClose}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
          <div style={{ fontFamily: FONT.display, fontSize: '1.4rem', fontWeight: 300, color: COLOR.textPrimary }}>Rate this salon</div>
          <p style={{ fontFamily: FONT.mono, fontSize: '0.45rem', letterSpacing: '0.15em', color: COLOR.textMuted, marginTop: '0.2rem' }}>{salon?.name}</p>
        </div>

        {/* Star picker */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(0)} style={S.starBtn}>
              <svg viewBox="0 0 100 100" width="28" height="28">
                <path d="M50,8 L63,35 L93,39 L71,60 L76,90 L50,76 L24,90 L29,60 L7,39 L37,35 Z"
                  fill={(hoverStar || stars) >= n ? COLOR.gold : 'rgba(212,175,55,0.18)'} />
              </svg>
            </button>
          ))}
        </div>

        <Field label="Your Name *">
          <input style={{...S.inp, opacity: user?.name ? 0.6 : 1}} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" maxLength={60} readOnly={!!user?.name} />
        </Field>
        <Field label="Email *">
          <input style={{...S.inp, opacity: user?.email ? 0.6 : 1}} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" readOnly={!!user?.email} />
        </Field>

        {/* Live, honest verification status */}
        {eligibility && (
          <div style={S.eligibilityRow}>
            {eligibility.eligibleForVerified ? (
              <><VerifiedBadge size={13} /><span style={S.eligText}>You booked this salon — your rating will be AuraVerified</span></>
            ) : (
              <span style={S.eligTextMuted}>No booking found for this email — your rating will be unverified</span>
            )}
          </div>
        )}

        <Field label="Comment (optional)">
          <textarea style={{ ...S.inp, height: 60, resize: 'none' }} value={comment} onChange={e => setComment(e.target.value)} placeholder={t('rating_comment_placeholder')} maxLength={500} />
        </Field>

        <motion.button style={{ ...S.submit, opacity: busy ? 0.6 : 1 }} onClick={submit} disabled={busy} whileHover={busy ? {} : { filter: 'brightness(1.06)' }} whileTap={busy ? {} : { scale: 0.98 }}>
          {busy ? 'Submitting…' : `✦ ${t('rating_submit')}`}
        </motion.button>

        {/* Existing reviews preview */}
        {existingReviews.length > 0 && (
          <div style={{ marginTop: '1.2rem', borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: '0.9rem' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: '0.42rem', letterSpacing: '0.2em', color: COLOR.textGhost, marginBottom: '0.6rem' }}>RECENT REVIEWS</div>
            {existingReviews.slice(0, 4).map((rv, i) => (
              <div key={i} style={S.reviewItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textPrimary }}>{rv.customerName}</span>
                  {rv.isVerified && <VerifiedBadge size={11} />}
                  <span style={{ fontFamily: FONT.mono, fontSize: '0.4rem', color: COLOR.gold, marginLeft: 'auto' }}>{'★'.repeat(rv.stars)}</span>
                </div>
                {rv.comment && <p style={{ fontFamily: FONT.body, fontSize: '0.74rem', color: COLOR.textMuted, lineHeight: 1.5 }}>{rv.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.8rem' }}>
      <label style={{ display: 'block', fontFamily: FONT.mono, fontSize: '0.42rem', letterSpacing: '0.16em', color: COLOR.textMuted, marginBottom: '0.32rem' }}>{label}</label>
      {children}
    </div>
  );
}

const S = {
  ov:  { position: 'fixed', inset: 0, zIndex: 920, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem 4rem 1.5rem', overflowY: 'auto' },
  back:{ position: 'fixed', inset: 0, background: 'rgba(3,2,4,0.88)', backdropFilter: 'blur(12px)' },
  box: { position: 'relative', width: '100%', maxWidth: 440, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 16, padding: 'clamp(1.2rem,5vw,1.8rem)', boxShadow: '0 30px 80px rgba(0,0,0,0.85)', maxHeight: '85vh', overflowY: 'auto' },
  close:{ position: 'absolute', top: '0.9rem', right: '0.9rem', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,248,220,0.3)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.75rem' },
  starBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 2 },
  inp: { width: '100%', padding: '0.52rem 0.78rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, outline: 'none', fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textPrimary, boxSizing: 'border-box' },
  eligibilityRow: { display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.8rem', padding: '0.4rem 0.6rem', background: 'rgba(212,175,55,0.04)', borderRadius: 6 },
  eligText: { fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.06em', color: COLOR.gold },
  eligTextMuted: { fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.06em', color: COLOR.textGhost },
  submit: { width: '100%', padding: '0.74rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.18em', fontWeight: 700, color: '#000', cursor: 'pointer' },
  reviewItem: { marginBottom: '0.7rem' },
};
