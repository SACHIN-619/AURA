// AuthModal — signup/login for regular users. Every signup creates
// role:'user' on the backend — there is no field here, or anywhere in this
// form, that could set a different role. Becoming an admin happens only by
// an operator manually editing the database, never through this UI.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API, useAura } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';

export default function AuthModal({ onClose, onAuthed }) {
  const { pushToast } = useAura();
  const [mode, setMode] = useState('login'); // login | signup
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const friendlyError = (msg = '') => {
    if (!msg || msg.toLowerCase().includes('failed to fetch') || msg.includes('networkerror') || msg.includes('err_internet'))
      return 'Connection failed — our servers may be warming up. Please try again in 30 seconds.';
    if (msg.includes('502') || msg.includes('503') || msg.includes('504'))
      return 'Server is starting up. This usually takes under a minute on first load — please try again shortly.';
    if (msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('incorrect'))
      return 'Incorrect email or password. Please check and try again.';
    if (msg.includes('404') || msg.toLowerCase().includes('not found'))
      return 'No account found with this email. Try signing up instead.';
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists'))
      return 'An account with this email already exists. Try logging in instead.';
    if (msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('disabled'))
      return 'This account has been suspended. Please contact support.';
    if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('8'))
      return 'Password must be at least 8 characters.';
    return msg || 'Something went wrong. Please try again.';
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body = mode === 'signup'
        ? { name: form.name, email: form.email, password: form.password, phone: form.phone }
        : { email: form.email, password: form.password };

      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Something went wrong');

      localStorage.setItem('aura_token', d.token);
      localStorage.setItem('aura_user', JSON.stringify(d.user));
      pushToast(mode === 'signup' ? `Welcome, ${d.user.name}!` : `Welcome back, ${d.user.name}!`);
      onAuthed?.(d.user, d.token);
      onClose();
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
        <button style={S.close} onClick={onClose}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: FONT.display, fontSize: '2.2rem', fontWeight: 300, color: COLOR.textPrimary }}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </div>
          <p style={{ fontFamily: FONT.mono, fontSize: '0.85rem', letterSpacing: '0.05em', color: COLOR.textMuted, marginTop: '0.6rem' }}>
            {mode === 'signup' ? 'Save bookings and ratings to your account' : 'Log in to see your booking history'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {mode === 'signup' && (
              <Field label="Name"><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Priya Sharma" maxLength={60} /></Field>
            )}
            <Field label="Email"><input style={S.inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" /></Field>
            <Field label="Password">
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  style={{ ...S.inp, paddingRight: '3.5rem' }} 
                  type={showPass ? 'text' : 'password'} 
                  value={form.password} 
                  onChange={e => set('password', e.target.value)} 
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  style={{
                    position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: COLOR.textMuted, fontFamily: FONT.mono,
                    fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer'
                  }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </Field>
            {mode === 'signup' && (
              <Field label="Phone (optional)"><input style={S.inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 90000 00000" /></Field>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p style={S.err}>{error}</p>}

        <motion.button style={{ ...S.submit, opacity: busy ? 0.6 : 1 }} onClick={submit} disabled={busy} whileHover={busy ? {} : { filter: 'brightness(1.06)' }} whileTap={busy ? {} : { scale: 0.98 }}>
          {busy ? 'Please wait…' : mode === 'signup' ? '✦ Create Account' : '✦ Log In'}
        </motion.button>

        <button style={S.switchBtn} onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError(''); }}>
          {mode === 'signup' ? 'Already have an account? Log in' : "New here? Create an account"}
        </button>

        <p style={S.skipNote}>You can also browse and book without an account — this just saves your history.</p>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={{ display: 'block', fontFamily: FONT.mono, fontSize: '0.85rem', letterSpacing: '0.08em', color: COLOR.textMuted, marginBottom: '0.32rem' }}>{label}</label>
      {children}
    </div>
  );
}

const S = {
  ov:  { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' },
  back:{ position: 'fixed', inset: 0, background: 'rgba(3,2,4,0.88)', backdropFilter: 'blur(12px)' },
  box: { position: 'relative', width: '100%', maxWidth: 520, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 20, padding: 'clamp(1.5rem,5vw,3rem)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' },
  close:{ position: 'absolute', top: '1rem', right: '1rem', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,248,220,0.4)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', border: 'none', fontSize: '0.85rem' },
  inp: { width: '100%', padding: '0.85rem 1.1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, outline: 'none', fontFamily: FONT.body, fontSize: '0.9rem', color: COLOR.textPrimary, boxSizing: 'border-box', transition: 'border-color 0.2s' },
  err: { 
    color: '#FF6B6B', 
    fontFamily: FONT.body, 
    fontSize: '0.85rem', 
    marginBottom: '0.8rem', 
    textAlign: 'center',
    padding: '0.6rem 1rem',
    background: 'rgba(239,83,80,0.12)',
    border: '1px solid rgba(239,83,80,0.3)',
    borderRadius: '8px',
    lineHeight: 1.4,
  },
  submit: { width: '100%', padding: '0.95rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.8rem', letterSpacing: '0.15em', fontWeight: 700, color: '#000', cursor: 'pointer', marginTop: '1rem', boxShadow: '0 8px 24px rgba(212,175,55,0.2)' },
  switchBtn: { display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', fontFamily: FONT.mono, fontSize: '0.85rem', letterSpacing: '0.04em', color: COLOR.gold, cursor: 'pointer', marginTop: '0.9rem', padding: '0.4rem' },
  skipNote: { textAlign: 'center', fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textGhost, marginTop: '0.7rem', lineHeight: 1.6 },
};