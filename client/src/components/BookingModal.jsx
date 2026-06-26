// Honest booking flow — WhatsApp-first when the salon has a real phone
// number (most reliable real-world path for Hyderabad salons who often
// don't check unknown calls but do check WhatsApp), falls back to an
// AURA-logged request only when no contact exists at all.
// No fake priced service menu — we show real OSM category tags only.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { COLOR, FONT, CATEGORY_LABELS } from '../utils/tokens';

const SLOTS = [
  '9:00 AM – 10:00 AM', '10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM',
  '12:00 PM – 1:00 PM', '2:00 PM – 3:00 PM', '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM', '5:00 PM – 6:00 PM', '6:00 PM – 7:00 PM'
];

function toWhatsAppNumber(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function BookingModal({ salon, onClose, onSuccess }) {
  const { pushToast, user } = useAura();
  const { t } = useLanguage();
  const hasPhone = !!salon?.contact?.phone;
  const hasWeb = !!salon?.contact?.website;
  const waNumber = toWhatsAppNumber(salon?.contact?.phone);

  const [mode, setMode] = useState(waNumber ? 'whatsapp' : 'request');
  const [step, setStep] = useState('contact');
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', category: '', date: '', slot: '', notes: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: '' }));
  };
  const today = new Date().toISOString().split('T')[0];

  const availableCategories = (salon?.serviceCategories?.length ? salon.serviceCategories : Object.keys(CATEGORY_LABELS))
    .map(tag => ({ tag, label: CATEGORY_LABELS[tag] || tag }));

  const validateContact = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.email.trim()) e.email = 'Email required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    setErrs(e);
    return !Object.keys(e).length;
  };

  const validateDetails = () => {
    const e = {};
    if (!form.category) e.category = 'Select a category';
    if (!form.date) e.date = 'Select date';
    if (!form.slot) e.slot = 'Select time';
    setErrs(e);
    return !Object.keys(e).length;
  };

  const openWhatsApp = () => {
    const categoryLabel = form.category ? (CATEGORY_LABELS[form.category] || form.category) : 'a service';
    const lines = [
      `Hello! I found *${salon?.name || 'your salon'}* on AURA — Hyderabad's beauty marketplace.`,
      `I'd like to book ${categoryLabel}${form.date ? ` on ${form.date}` : ''}${form.slot ? ` around ${form.slot}` : ''}.`,
      form.name ? `My name: ${form.name}` : null,
      'Could you let me know your availability?',
    ].filter(Boolean).join('\n\n');
    
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`, '_blank', 'noopener,noreferrer');
    onSuccess?.({ salonName: salon?.name, hub: salon?.hub || '', date: form.date, slot: form.slot, viaWhatsApp: true });
    onClose();
  };

  const submitRequest = async () => {
    setBusy(true);
    try {
      fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name, phone: form.phone })
      }).catch(() => {});

      const r = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon._id,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          service: form.category,
          date: form.date,
          timeSlot: form.slot,
          notes: form.notes,
          sourceHub: salon.hub
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Request failed');
      
      onSuccess?.({ salonName: salon.name, hub: salon.hub || '', date: form.date, slot: form.slot, viaWhatsApp: false });
      onClose();
    } catch (e) {
      pushToast(e.message || 'Could not send request — please try again', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
        <button style={S.close} onClick={onClose}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: FONT.display, fontSize: '1.5rem', fontWeight: 300, color: COLOR.textPrimary }}>
            {mode === 'whatsapp' ? t('booking_whatsapp_title') : t('booking_request_title')}
          </div>
          <p style={{ fontFamily: FONT.mono, fontSize: '0.47rem', letterSpacing: '0.17em', color: COLOR.textMuted, marginTop: '0.25rem' }}>
            {salon?.name || 'Salon'} · {salon?.hub || 'Hyderabad'}
          </p>
        </div>

        {waNumber && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setMode('whatsapp')} style={{ ...S.modeTab, ...(mode === 'whatsapp' ? S.modeTabActive : {}) }}>📱 WhatsApp</button>
            <button onClick={() => setMode('request')} style={{ ...S.modeTab, ...(mode === 'request' ? S.modeTabActive : {}) }}>✉ AURA Request</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', padding: '0.7rem 0.9rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 7, marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>ℹ</span>
          <span style={{ fontFamily: FONT.mono, fontSize: '0.41rem', letterSpacing: '0.08em', color: mode === 'whatsapp' ? 'rgba(255,248,220,0.45)' : '#EF5350', fontWeight: mode === 'whatsapp' ? 400 : 700, lineHeight: 1.7 }}>
            {mode === 'whatsapp'
              ? "We'll open WhatsApp with a pre-filled message to this salon's real number. You send it directly — we don't see or store the conversation."
              : "This salon has no WhatsApp number listed yet. We'll log your request and our team will try to reach them — response isn't guaranteed for unverified listings."}
          </span>
        </div>

        {hasWeb && (
          <a href={salon.contact.website} target="_blank" rel="noopener noreferrer" style={S.webLink}>🌐 Visit salon website</a>
        )}

        {mode === 'whatsapp' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Field label={t('booking_your_name')}>
              <input style={{...S.inp, opacity: user?.name ? 0.6 : 1}} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Priya Sharma" maxLength={60} readOnly={!!user?.name} />
            </Field>
            <Field label="Category">
              <select style={S.inp} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Not sure / ask them</option>
                {availableCategories.map(c => <option key={c.tag} value={c.tag}>{c.label}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Field label={t('booking_date')}><input style={S.inp} type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} /></Field>
              <Field label={t('booking_time')}>
                <select style={S.inp} value={form.slot} onChange={e => set('slot', e.target.value)}>
                  <option value="">Flexible</option>
                  {SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <motion.button style={S.waBtn} onClick={openWhatsApp} whileHover={{ filter: 'brightness(1.06)' }} whileTap={{ scale: 0.98 }}>
              📱 {t('booking_open_whatsapp')}
            </motion.button>
          </motion.div>
        )}

        {mode === 'request' && (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.3rem' }}>
              {['contact', 'details', 'confirm'].map((s, i) => (
                <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: ['contact', 'details', 'confirm'].indexOf(step) >= i ? COLOR.gold : 'rgba(212,175,55,0.2)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              {step === 'contact' && (
                <motion.div key="c" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Field label={`${t('booking_your_name')} *`} err={errs.name}><input style={{ ...S.inp, ...(errs.name ? S.inpErr : {}), opacity: user?.name ? 0.6 : 1 }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Priya Sharma" maxLength={60} readOnly={!!user?.name} /></Field>
                  <Field label={`${t('booking_email')} *`} err={errs.email}><input style={{ ...S.inp, ...(errs.email ? S.inpErr : {}), opacity: user?.email ? 0.6 : 1 }} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" readOnly={!!user?.email} /></Field>
                  <Field label="Phone (optional)"><input style={S.inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 90000 00000" /></Field>
                  <button style={S.next} onClick={() => validateContact() && setStep('details')}>{t('booking_continue')}</button>
                </motion.div>
              )}
              {step === 'details' && (
                <motion.div key="d" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Field label={`${t('booking_category')} *`} err={errs.category}>
                    <select style={{ ...S.inp, ...(errs.category ? S.inpErr : {}) }} value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">Select a category</option>
                      {availableCategories.map(c => <option key={c.tag} value={c.tag}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Date *" err={errs.date}><input style={{ ...S.inp, ...(errs.date ? S.inpErr : {}) }} type="date" value={form.date} min={today} onChange={e => set('date', e.target.value)} /></Field>
                  <Field label="Time *" err={errs.slot}>
                    <select style={{ ...S.inp, ...(errs.slot ? S.inpErr : {}) }} value={form.slot} onChange={e => set('slot', e.target.value)}>
                      <option value="">Select time slot</option>
                      {SLOTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Notes (optional)"><textarea style={{ ...S.inp, height: 64, resize: 'none' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special requirements…" maxLength={400} /></Field>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <button style={S.next} onClick={() => validateDetails() && setStep('confirm')}>{t('booking_review')}</button>
                    <button style={{...S.back2, width: '100%'}} onClick={() => setStep('contact')}>{t('booking_back')}</button>
                  </div>
                </motion.div>
              )}
              {step === 'confirm' && (
                <motion.div key="conf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    {[
                      ['👤', 'Name', form.name],
                      ['📧', 'Email', form.email],
                      form.phone && ['📱', 'Phone', form.phone],
                      ['✂', 'Category', CATEGORY_LABELS[form.category] || form.category],
                      ['📅', 'Date', form.date],
                      ['⏰', 'Time', form.slot],
                      form.notes && ['📝', 'Notes', form.notes]
                    ].filter(Boolean).map(([icon, label, val]) => (
                      <div key={label} style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.1/em', color: COLOR.textGhost, width: 50, flexShrink: 0 }}>{label}</span>
                        <span style={{ fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textPrimary, wordBreak: 'break-word' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.08em', color: 'rgba(255,248,220,0.3)', lineHeight: 1.7, marginBottom: '1rem' }}>This is a request, not a confirmed booking. We'll email you once the salon responds.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <motion.button style={{ ...S.next, width: '100%', opacity: busy ? 0.6 : 1 }} onClick={submitRequest} disabled={busy} whileHover={busy ? {} : { filter: 'brightness(1.06)' }} whileTap={busy ? {} : { scale: 0.98 }}>
                      {busy ? 'Sending…' : `✦ ${t('booking_confirm')}`}
                    </motion.button>
                    <button style={{...S.back2, width: '100%'}} onClick={() => setStep('details')}>{t('booking_back')}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, err, children }) {
  return (
    <div style={{ marginBottom: '0.88rem', flex: 1, minWidth: '100%' }}>
      <label style={{ display: 'block', fontFamily: FONT.mono, fontSize: '0.85rem', letterSpacing: '0.05em', color: COLOR.textMuted, marginBottom: '0.4rem' }}>{label}</label>
      {children}
      {err && <p style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: '#EF5350', marginTop: '0.22rem' }}>{err}</p>}
    </div>
  );
}

const S = {
  ov: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  back: { position: 'absolute', inset: 0, background: 'rgba(3,2,4,0.88)', backdropFilter: 'blur(12px)' },
  box: { position: 'relative', width: '100%', maxWidth: 480, background: 'rgba(13,0,19,0.97)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 16, padding: 'clamp(1.2rem,5vw,2rem)', boxShadow: '0 30px 80px rgba(0,0,0,0.85)', maxHeight: '92vh', overflowY: 'auto' },
  close: { position: 'absolute', top: '0.9rem', right: '0.9rem', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,248,220,0.6)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem' },
  inp: { width: '100%', padding: '0.6rem 0.82rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, outline: 'none', fontFamily: FONT.body, fontSize: '1rem', color: COLOR.textPrimary, transition: 'border-color 0.2s', boxSizing: 'border-box' },
  inpErr: { borderColor: 'rgba(239,83,80,0.5)' },
  next: { flex: 1, padding: '0.8rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.8rem', letterSpacing: '0.1em', fontWeight: 700, color: '#000', cursor: 'pointer', width: '100%' },
  back2: { flex: 0, padding: '0.8rem 1.1rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.75rem', letterSpacing: '0.1em', color: COLOR.textMuted, cursor: 'pointer', whiteSpace: 'nowrap' },
  modeTab: { padding: '0.5rem 0.9rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.65rem', letterSpacing: '0.1em', color: COLOR.textMuted, cursor: 'pointer' },
  modeTabActive: { background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.4)', color: COLOR.gold },
  webLink: { display: 'block', textAlign: 'center', padding: '0.5rem', marginBottom: '1rem', fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.1em', color: COLOR.gold, border: '1px solid rgba(212,175,55,0.18)', borderRadius: 6 },
  waBtn: { width: '100%', padding: '0.85rem', marginTop: '0.5rem', background: 'linear-gradient(135deg,#25D366,#1DA851)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: '#fff', cursor: 'pointer' },
};