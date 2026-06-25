import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR, FONT, CATEGORY_LABELS } from '../utils/tokens';

export default function BookingModal({ 
  salon, 
  uiConfig, // AI Layer injects all UI strings translated based on current fallback logic
  onClose, 
  onSuccess,
  onSubmitData // Triggers your API route handling backend storage/actions
}) {
  // Destructure with a completely clean dictionary object provided by your AI Layer
  const {
    title_whatsapp = "Message on WhatsApp",
    title_request = "Send a Request",
    label_name = "Your Name",
    label_email = "Email",
    label_phone = "Phone (optional)",
    label_category = "Category",
    label_date = "Preferred date",
    label_time = "Preferred time",
    label_notes = "Notes (optional)",
    placeholder_notes = "Any special requirements…",
    btn_continue = "Continue →",
    btn_review = "Review →",
    btn_back = "← Back",
    btn_confirm = "Send Request",
    btn_whatsapp = "Open WhatsApp & Send",
    disclosure_whatsapp = "",
    disclosure_request = "",
    option_not_sure = "Not sure / ask them",
    option_flexible = "Flexible",
    select_placeholder = "Select...",
    err_name = "Name required",
    err_email = "Valid email required",
    err_category = "Select a category",
    err_date = "Select date",
    err_slot = "Select time",
    msg_sending = "Sending…",
    tab_wa = "📱 WhatsApp",
    tab_req = "✉ AURA Request",
    web_label = "🌐 Visit salon website"
  } = uiConfig || {};

  const waNumber = salon?.contact?.phone ? salon.contact.phone.replace(/[^\d]/g, '') : null;
  const [mode, setMode] = useState(waNumber ? 'whatsapp' : 'request');
  const [step, setStep] = useState('contact');
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: '', date: '', slot: '', notes: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: '' }));
  };

  const validateContact = () => {
    const e = {};
    if (!form.name.trim()) e.name = err_name;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = err_email;
    setErrs(e);
    return !Object.keys(e).length;
  };

  const validateDetails = () => {
    const e = {};
    if (!form.category) e.category = err_category;
    if (!form.date) e.date = err_date;
    if (!form.slot) e.slot = err_slot;
    setErrs(e);
    return !Object.keys(e).length;
  };

  const handleWhatsAppAction = () => {
    onSuccess?.({ 
      salonName: salon?.name, 
      hub: salon?.hub, 
      date: form.date, 
      slot: form.slot, 
      viaWhatsApp: true,
      formData: form 
    });
    onClose();
  };

  const handleFormSubmit = async () => {
    setBusy(true);
    try {
      await onSubmitData?.(form, salon._id);
      onSuccess?.({ 
        salonName: salon?.name, 
        hub: salon?.hub, 
        date: form.date, 
        slot: form.slot, 
        viaWhatsApp: false,
        formData: form 
      });
      onClose();
    } catch (e) {
      setErrs({ submit: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}>
        <button style={S.close} onClick={onClose}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: FONT.display, fontSize: '1.5rem', fontWeight: 300, color: COLOR.textPrimary }}>
            {mode === 'whatsapp' ? title_whatsapp : title_request}
          </div>
          <p style={{ fontFamily: FONT.mono, fontSize: '0.47rem', letterSpacing: '0.17em', color: COLOR.textMuted, marginTop: '0.25rem' }}>
            {salon?.name} · {salon?.hub}
          </p>
        </div>

        {waNumber && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
            <button onClick={() => setMode('whatsapp')} style={{ ...S.modeTab, ...(mode === 'whatsapp' ? S.modeTabActive : {}) }}>{tab_wa}</button>
            <button onClick={() => setMode('request')} style={{ ...S.modeTab, ...(mode === 'request' ? S.modeTabActive : {}) }}>{tab_req}</button>
          </div>
        )}

        <div style={S.disclosureBox}>
          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>ℹ</span>
          <span style={S.disclosureText}>
            {mode === 'whatsapp' ? disclosure_whatsapp : disclosure_request}
          </span>
        </div>

        {salon?.contact?.website && (
          <a href={salon.contact.website} target="_blank" rel="noopener noreferrer" style={S.webLink}>{web_label}</a>
        )}

        {mode === 'whatsapp' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Field label={label_name}>
              <input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} maxLength={60} />
            </Field>
            <Field label={label_category}>
              <select style={S.inp} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">{option_not_sure}</option>
                {(salon?.serviceCategories || []).map(tag => (
                  <option key={tag} value={tag}>{CATEGORY_LABELS[tag] || tag}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Field label={label_date}><input style={S.inp} type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
              <Field label={label_time}>
                <select style={S.inp} value={form.slot} onChange={e => set('slot', e.target.value)}>
                  <option value="">{option_flexible}</option>
                  {(uiConfig?.slots || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <motion.button style={S.waBtn} onClick={handleWhatsAppAction}>
              {btn_whatsapp}
            </motion.button>
          </motion.div>
        )}

        {mode === 'request' && (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.3rem' }}>
              {['contact', 'details', 'confirm'].map((s, i) => (
                <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: ['contact', 'details', 'confirm'].indexOf(step) >= i ? COLOR.gold : 'rgba(212,175,55,0.2)' }} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              {step === 'contact' && (
                <motion.div key="c" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Field label={label_name} err={errs.name}><input style={{ ...S.inp, ...(errs.name ? S.inpErr : {}) }} value={form.name} onChange={e => set('name', e.target.value)} maxLength={60} /></Field>
                  <Field label={label_email} err={errs.email}><input style={{ ...S.inp, ...(errs.email ? S.inpErr : {}) }} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
                  <Field label={label_phone}><input style={S.inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
                  <button style={S.next} onClick={() => validateContact() && setStep('details')}>{btn_continue}</button>
                </motion.div>
              )}
              {step === 'details' && (
                <motion.div key="d" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Field label={label_category} err={errs.category}>
                    <select style={{ ...S.inp, ...(errs.category ? S.inpErr : {}) }} value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">{select_placeholder}</option>
                      {(salon?.serviceCategories || []).map(tag => <option key={tag} value={tag}>{CATEGORY_LABELS[tag] || tag}</option>)}
                    </select>
                  </Field>
                  <Field label={label_date} err={errs.date}><input style={{ ...S.inp, ...(errs.date ? S.inpErr : {}) }} type="date" value={form.date} /></Field>
                  <Field label={label_time} err={errs.slot}>
                    <select style={{ ...S.inp, ...(errs.slot ? S.inpErr : {}) }} value={form.slot} onChange={e => set('slot', e.target.value)}>
                      <option value="">{select_placeholder}</option>
                      {(uiConfig?.slots || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label={label_notes}><textarea style={{ ...S.inp, height: 64, resize: 'none' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={placeholder_notes} maxLength={400} /></Field>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button style={S.back2} onClick={() => setStep('contact')}>{btn_back}</button>
                    <button style={S.next} onClick={() => validateDetails() && setStep('confirm')}>{btn_review}</button>
                  </div>
                </motion.div>
              )}
              {step === 'confirm' && (
                <motion.div key="conf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div style={S.summaryCard}>
                    {[['👤', label_name, form.name], ['📧', label_email, form.email], form.phone && ['📱', label_phone, form.phone], ['✂', label_category, CATEGORY_LABELS[form.category] || form.category], ['📅', label_date, form.date], ['⏰', label_time, form.slot]].filter(Boolean).map(([icon, label, val]) => (
                      <div key={label} style={S.summaryRow}>
                        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
                        <span style={S.summaryLabel}>{label}</span>
                        <span style={S.summaryVal}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {errs.submit && <p style={S.errTxt}>{errs.submit}</p>}
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button style={S.back2} onClick={() => setStep('details')}>{btn_back}</button>
                    <motion.button style={{ ...S.next, flex: 2, opacity: busy ? 0.6 : 1 }} onClick={handleFormSubmit} disabled={busy}>
                      {busy ? msg_sending : `✦ ${btn_confirm}`}
                    </motion.button>
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
    <div style={{ marginBottom: '0.88rem', flex: 1 }}>
      <label style={{ display: 'block', fontFamily: FONT.mono, fontSize: '0.43rem', letterSpacing: '0.17em', color: COLOR.textMuted, marginBottom: '0.36rem' }}>{label}</label>
      {children}
      {err && <p style={{ fontFamily: FONT.mono, fontSize: '0.39rem', color: '#EF5350', marginTop: '0.22rem' }}>{err}</p>}
    </div>
  );
}

const S = {
  ov: { position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  back: { position: 'absolute', inset: 0, background: 'rgba(3,2,4,0.88)', backdropFilter: 'blur(12px)' },
  box: { position: 'relative', width: '100%', maxWidth: 480, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 16, padding: 'clamp(1.2rem,5vw,2rem)', boxShadow: '0 30px 80px rgba(0,0,0,0.85)', maxHeight: '92vh', overflowY: 'auto' },
  close: { position: 'absolute', top: '0.9rem', right: '0.9rem', width: 26, height: 26, background: 'none', border: 'none', color: 'rgba(255,248,220,0.3)', cursor: 'pointer' },
  disclosureBox: { display: 'flex', gap: '0.6rem', padding: '0.7rem 0.9rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 7, marginBottom: '1rem' },
  disclosureText: { fontFamily: FONT.mono, fontSize: '0.41rem', letterSpacing: '0.08em', color: 'rgba(255,248,220,0.45)', lineHeight: 1.7 },
  inp: { width: '100%', padding: '0.56rem 0.82rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, outline: 'none', fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textPrimary, boxSizing: 'border-box' },
  inpErr: { borderColor: 'rgba(239,83,80,0.5)' },
  next: { flex: 1, padding: '0.76rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.2em', fontWeight: 700, color: '#000', cursor: 'pointer' },
  back2: { padding: '0.76rem 1.1rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.47rem', color: COLOR.textMuted, cursor: 'pointer' },
  modeTab: { padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.44rem', color: COLOR.textMuted, cursor: 'pointer' },
  modeTabActive: { borderColor: 'rgba(212,175,55,0.5)', color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  webLink: { display: 'block', textAlign: 'center', padding: '0.5rem', marginBottom: '1rem', fontFamily: FONT.mono, fontSize: '0.44rem', color: COLOR.gold, border: '1px solid rgba(212,175,55,0.18)', borderRadius: 6 },
  waBtn: { width: '100%', padding: '0.85rem', marginTop: '0.5rem', background: 'linear-gradient(135deg,#25D366,#1DA851)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.5rem', fontWeight: 700, color: '#fff', cursor: 'pointer' },
  summaryCard: { background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' },
  summaryRow: { display: 'flex', gap: '0.7rem', marginBottom: '0.5rem', alignItems: 'flex-start' },
  summaryLabel: { fontFamily: FONT.mono, fontSize: '0.4rem', color: COLOR.textGhost, width: 75, flexShrink: 0 },
  summaryVal: { fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textPrimary, wordBreak: 'break-word' },
  errTxt: { fontFamily: FONT.mono, fontSize: '0.4rem', color: '#EF5350', marginBottom: '1rem', textAlign: 'center' }
};