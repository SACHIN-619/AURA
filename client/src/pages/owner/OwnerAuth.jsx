// client/pages/owner/OwnerAuth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLOR, FONT } from '../../utils/tokens';

export default function OwnerAuth() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', boutiqueName: '' });
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    
    // Safety check
    if (!form.email || !form.password) {
      setErr('All validation fields must be saturated.');
      return;
    }

    try {
      // Logic placeholder linking your API architecture
      // const res = await fetch(`${API}/api/auth/owner/${isRegister ? 'register' : 'login'}`, ...);
      // localStorage.setItem('token', data.token);
      
      // On success, guide them directly to the console node workspace
      navigate('/owner/dashboard');
    } catch {
      setErr('Authorization handshake rejected.');
    }
  };

  return (
    <div style={S.screen}>
      <div style={S.authBox}>
        <h2 style={S.title}>{isRegister ? '✦ Initialize Console Node' : '✦ Sync Control Console'}</h2>
        
        {err && <div style={S.errPill}>{err}</div>}

        <form onSubmit={handleSubmit} style={S.form}>
          {isRegister && (
            <input 
              type="text" 
              placeholder="Official Boutique Identity Name" 
              value={form.boutiqueName}
              onChange={e => setForm({...form, boutiqueName: e.target.value})}
              style={S.input}
            />
          )}
          <input 
            type="email" 
            placeholder="Secure Node Email" 
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            style={S.input}
          />
          <input 
            type="password" 
            placeholder="Security Phrase Tokens" 
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            style={S.input}
          />
          
          <button type="submit" style={S.submitBtn}>
            {isRegister ? 'Generate Workspace' : 'Unlock Dashboard'}
          </button>
        </form>

        <p style={S.switchText} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already verified? Access node' : 'New establishment? Initialize registration framework'}
        </p>
      </div>
    </div>
  );
}

const S = {
  screen: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09070f' },
  authBox: { background: COLOR.glass, border: `1px solid ${COLOR.edge}`, borderRadius: 16, padding: '2.5rem', width: 380, backdropFilter: 'blur(20px)', textAlign: 'center' },
  title: { fontFamily: FONT.display, fontSize: '1.3rem', color: '#fff', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { background: 'rgba(0,0,0,0.4)', border: `1px solid ${COLOR.edge}`, borderRadius: 8, padding: '0.75rem', color: '#fff', fontFamily: FONT.body, fontSize: '0.85rem' },
  submitBtn: { background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', color: '#1a1410', border: 'none', padding: '0.75rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.body },
  switchText: { fontSize: '0.7rem', color: COLOR.textMuted, cursor: 'pointer', marginTop: '1.5rem', fontFamily: FONT.mono },
  errPill: { background: 'rgba(239,83,83,0.1)', border: '1px solid #EF5350', color: '#EF5350', padding: '0.5rem', borderRadius: 6, fontSize: '0.75rem', marginBottom: '1rem', fontFamily: FONT.body },
  cancelClaimBtn: { background: '#E57373', border: 'none', color: '#fff', borderRadius: 12, padding: '0 0.5rem', fontSize: '0.55rem', fontFamily: FONT.mono, cursor: 'pointer' },
  editIconBadge: { position: 'absolute', top: 10, right: 12, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: `1px solid ${COLOR.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem' },
  secondaryBtn: { width: '100%', padding: '0.55rem', background: 'rgba(212,175,55,0.06)', border: `1px solid ${COLOR.goldDim}`, color: COLOR.gold, borderRadius: 8, fontFamily: FONT.body, fontSize: '0.72rem', cursor: 'pointer' }
};