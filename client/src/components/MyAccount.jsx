import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COLOR, FONT } from '../utils/tokens';
import VerifiedBadge from './VerifiedBadge';

const LEVEL_THRESHOLDS = [0, 25, 60, 120, 220, 400, 700];
function xpProgress(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  const next = LEVEL_THRESHOLDS[level];
  if (next === undefined) return { level, pct: 100, labelKey: 'Max level reached' };
  const prev = LEVEL_THRESHOLDS[level - 1] || 0;
  const pct = Math.round(((xp - prev) / (next - prev)) * 100);
  return { level, pct, remainingXp: next - xp, nextLevel: level + 1 };
}

const LEVEL_NAMES = ['', 'Newcomer', 'Explorer', 'Enthusiast', 'Connoisseur', 'Curator', 'Elite', 'Legend'];

const TABS = [
  { id: 'overview', icon: '◈', label: 'Overview' },
  { id: 'bookings', icon: '📋', label: 'Bookings' },
  { id: 'ratings',  icon: '★',  label: 'My Reviews' },
  { id: 'shop',     icon: '🏪', label: 'My Shop' },
  { id: 'settings', icon: '⚙',  label: 'Settings' },
];

// ── Notification Banner (static, can be wired to backend later) ────────────
function NotificationBar({ role, shopStatus }) {
  const notes = [];
  if (shopStatus === 'pending')  notes.push({ type: 'info', msg: '⏳ Your shop claim is under admin review. We\'ll notify you within 24–48 hours.' });
  if (shopStatus === 'approved') notes.push({ type: 'success', msg: '✦ Your shop claim was approved! Go to "My Shop" to manage your listing.' });
  if (shopStatus === 'rejected') notes.push({ type: 'error', msg: '✕ Your shop claim was rejected. Contact support for details.' });
  if (role === 'owner')          notes.push({ type: 'success', msg: '✦ You have an active shop listing. Use "My Shop" to manage it.' });
  if (!notes.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
      {notes.map((n, i) => (
        <div key={i} style={{
          padding: '0.75rem 1rem', borderRadius: 8,
          background: n.type === 'success' ? 'rgba(76,175,80,0.1)' : n.type === 'error' ? 'rgba(239,83,80,0.1)' : 'rgba(33,150,243,0.1)',
          border: `1px solid ${n.type === 'success' ? 'rgba(76,175,80,0.3)' : n.type === 'error' ? 'rgba(239,83,80,0.3)' : 'rgba(33,150,243,0.3)'}`,
          fontFamily: FONT.body, fontSize: '0.82rem',
          color: n.type === 'success' ? '#81C784' : n.type === 'error' ? '#EF9A9A' : '#90CAF9',
        }}>{n.msg}</div>
      ))}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ data, progress }) {
  const recent = (data?.bookings || []).slice(0, 3);
  const statsItems = [
    { label: 'Bookings', value: data?.bookings?.length || 0, icon: '📋' },
    { label: 'Reviews', value: data?.ratings?.length || 0, icon: '★' },
    { label: 'XP Points', value: data?.user?.xp || 0, icon: '⚡' },
    { label: 'Level', value: LEVEL_NAMES[progress?.level] || `L${progress?.level}`, icon: '🏆' },
  ];
  return (
    <div>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {statsItems.map(s => (
          <div key={s.label} style={ST.statCard}>
            <div style={ST.statIcon}>{s.icon}</div>
            <div style={ST.statValue}>{s.value}</div>
            <div style={ST.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div style={ST.sectionTitle}>Recent Activity</div>
      {recent.length === 0
        ? <div style={ST.empty}>No bookings yet — explore salons and make your first booking!</div>
        : recent.map(b => (
          <div key={b._id} style={ST.histRow}>
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
              <div style={ST.histIcon}>✂</div>
              <div>
                <div style={ST.histTitle}>{b.salonName}</div>
                <div style={ST.histMeta}>{b.salonHub} · {b.service} · {b.date}</div>
              </div>
            </div>
            <span style={{ ...ST.badge, background: b.status === 'cancelled' ? 'rgba(239,83,80,0.15)' : 'rgba(76,175,80,0.15)', color: b.status === 'cancelled' ? '#EF9A9A' : '#81C784', border: `1px solid ${b.status === 'cancelled' ? 'rgba(239,83,80,0.3)' : 'rgba(76,175,80,0.3)'}` }}>{(b.status || 'confirmed').toUpperCase()}</span>
          </div>
        ))
      }

      {/* XP Activity Log */}
      {data?.user?.activityLog?.length > 0 && (
        <>
          <div style={{ ...ST.sectionTitle, marginTop: '2rem' }}>XP Reward History</div>
          {data.user.activityLog.slice(0, 5).map((log, i) => (
            <div key={i} style={ST.histRow}>
              <div style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textPrimary }}>{log.action?.replace(/_/g, ' ')}</div>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.gold }}>+XP · {new Date(log.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Bookings Tab ───────────────────────────────────────────────────────────
function BookingsTab({ bookings }) {
  if (!bookings?.length) return <div style={ST.empty}>No bookings yet — your booking history will appear here.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {bookings.map(b => (
        <div key={b._id} style={ST.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ fontFamily: FONT.display, fontSize: '1rem', color: COLOR.textPrimary }}>{b.salonName}</div>
            <span style={{ ...ST.badge, background: b.status === 'cancelled' ? 'rgba(239,83,80,0.15)' : 'rgba(76,175,80,0.15)', color: b.status === 'cancelled' ? '#EF9A9A' : '#81C784', border: `1px solid ${b.status === 'cancelled' ? 'rgba(239,83,80,0.3)' : 'rgba(76,175,80,0.3)'}` }}>{(b.status || 'confirmed').toUpperCase()}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {[['📍 Location', b.salonHub], ['💈 Service', b.service || 'General'], ['📅 Date', b.date || '—'], ['⏰ Time', b.timeSlot || '—']].map(([l, v]) => (
              <div key={l} style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost }}>
                <span style={{ color: COLOR.textMuted, display: 'block', marginBottom: '0.1rem' }}>{l}</span>
                <span style={{ color: COLOR.textPrimary, fontSize: '0.72rem' }}>{v}</span>
              </div>
            ))}
          </div>
          {b.notes && <div style={{ fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textMuted, marginTop: '0.5rem', borderTop: '1px solid rgba(212,175,55,0.08)', paddingTop: '0.5rem' }}>📝 {b.notes}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Reviews Tab ────────────────────────────────────────────────────────────
function ReviewsTab({ ratings }) {
  if (!ratings?.length) return <div style={ST.empty}>You haven't reviewed any salons yet. Visit a salon and share your experience!</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {ratings.map(r => (
        <div key={r._id} style={ST.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <div style={{ fontFamily: FONT.display, fontSize: '1rem', color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {r.salonId?.name || 'Salon'}
              {r.isVerified && <VerifiedBadge size={14} />}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost }}>{new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          <div style={{ color: COLOR.gold, fontSize: '1rem', marginBottom: '0.4rem', letterSpacing: 2 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
          {r.comment && <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, lineHeight: 1.6, margin: 0 }}>"{r.comment}"</p>}
          {r.salonId?.hub && <div style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textGhost, marginTop: '0.4rem' }}>📍 {r.salonId.hub}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Shop Management Tab ────────────────────────────────────────────────────
function ShopTab({ user, token }) {
  const isOwner = user?.role === 'owner';
  const claimStatus = user?.shopClaimStatus || 'none';
  const adminMsg = user?.shopClaimMessage;

  const [salonSearch, setSalonSearch] = useState('');
  const [claiming, setClaiming]       = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [msg, setMsg]                 = useState('');
  const [msgOk, setMsgOk]             = useState(true);

  const submitClaim = async () => {
    if (!salonSearch.trim()) return;
    setClaiming(true); setMsg('');
    try {
      const r = await fetch(`${API}/api/salons/claim`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token') || ''}`
        },
        body: JSON.stringify({ salonName: salonSearch }),
      });
      const d = await r.json();
      setMsgOk(d.success);
      setMsg(d.message || d.error || 'Unknown error');
      if (d.success) { setSalonSearch(''); window.location.reload(); }
    } catch {
      setMsgOk(false); setMsg('Network error — please try again.');
    } finally { setClaiming(false); }
  };

  const cancelClaim = async () => {
    if (!window.confirm('Withdraw your pending shop claim?')) return;
    setCancelling(true); setMsg('');
    try {
      const r = await fetch(`${API}/api/salons/claim`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aura_token') || ''}`
        }
      });
      const d = await r.json();
      setMsgOk(d.success);
      setMsg(d.message || d.error || 'Unknown error');
      if (d.success) setTimeout(() => window.location.reload(), 1000);
    } catch {
      setMsgOk(false); setMsg('Network error.');
    } finally { setCancelling(false); }
  };

  // ── Status banners ─────────────────────────────────────────────────────
  if (isOwner || claimStatus === 'approved') {
    return (
      <div>
        <div style={ST.sectionTitle}>Shop Management</div>
        <div style={ST.card}>
          <div style={{ fontFamily: FONT.body, fontSize: '0.9rem', color: COLOR.gold, marginBottom: '0.75rem' }}>✦ Verified Shop Owner</div>
          {adminMsg && <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: '#81C784', marginBottom: '0.75rem', lineHeight: 1.5 }}>💬 Admin: "{adminMsg}"</p>}
          <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, marginBottom: '1.2rem', lineHeight: 1.6 }}>
            Your listing is verified. Use the Owner Dashboard to manage services, view analytics, and respond to reviews.
          </p>
          <a href="/owner/dashboard" style={{ display: 'block', padding: '0.85rem', background: 'linear-gradient(135deg,#D4AF37,#AA8A2A)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.15em', fontWeight: 700, color: '#000', cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
            ✦ Open Owner Dashboard
          </a>
        </div>
        <div style={{ ...ST.sectionTitle, marginTop: '1.5rem' }}>Quick Links</div>
        {[['Manage Services & Pricing', '/owner/dashboard/services'], ['Respond to Reviews via AI', '/owner/dashboard/reviews']].map(([label, href]) => (
          <a key={label} href={href} style={{ ...ST.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary }}>{label}</span>
            <span style={{ color: COLOR.gold }}>→</span>
          </a>
        ))}
      </div>
    );
  }

  if (claimStatus === 'pending') {
    return (
      <div>
        <div style={ST.sectionTitle}>Your Claim Status</div>
        <div style={ST.card}>
          <div style={{ fontFamily: FONT.body, fontSize: '0.9rem', color: '#90CAF9', marginBottom: '0.5rem' }}>⏳ Claim Under Review</div>
          <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, lineHeight: 1.6, marginBottom: '1rem' }}>
            Your shop claim has been submitted and is awaiting admin review. This usually takes 24–48 hours. You'll see the status update here.
          </p>
          <button style={{ ...ST.dangerBtn, marginTop: 0 }} onClick={cancelClaim} disabled={cancelling}>
            {cancelling ? '⟳ Withdrawing…' : '✕ Withdraw Claim'}
          </button>
          {msg && <p style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: msgOk ? '#81C784' : '#EF9A9A', marginTop: '0.5rem' }}>{msg}</p>}
        </div>
      </div>
    );
  }

  if (claimStatus === 'rejected') {
    return (
      <div>
        <div style={ST.sectionTitle}>Claim Status</div>
        <div style={{ ...ST.card, borderColor: 'rgba(239,83,80,0.25)' }}>
          <div style={{ fontFamily: FONT.body, fontSize: '0.9rem', color: '#EF9A9A', marginBottom: '0.5rem' }}>✕ Claim Not Approved</div>
          {adminMsg && <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, lineHeight: 1.5, marginBottom: '0.75rem' }}>💬 Admin response: "{adminMsg}"</p>}
          <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textGhost, lineHeight: 1.5 }}>
            You can submit a new claim for a different salon, or contact support if you believe this was an error.
          </p>
        </div>
        <div style={{ ...ST.sectionTitle, marginTop: '1.5rem' }}>Submit a New Claim</div>
        {/* falls through to claim form below — render form inline */}
        <ClaimForm salonSearch={salonSearch} setSalonSearch={setSalonSearch} claiming={claiming} submitClaim={submitClaim} msg={msg} msgOk={msgOk} />
      </div>
    );
  }

  // default: claimStatus === 'none'
  return (
    <div>
      <div style={ST.sectionTitle}>Claim Your Shop</div>
      <div style={ST.card}>
        <p style={{ fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textMuted, marginBottom: '1.2rem', lineHeight: 1.6 }}>
          Are you a salon owner listed on AURA? Claim your listing to unlock full control — edit details, set pricing, respond to reviews, and receive a <strong style={{ color: COLOR.gold }}>Verified Badge</strong>.
        </p>
        <ClaimForm salonSearch={salonSearch} setSalonSearch={setSalonSearch} claiming={claiming} submitClaim={submitClaim} msg={msg} msgOk={msgOk} />
      </div>
      <div style={{ ...ST.sectionTitle, marginTop: '1.5rem' }}>What You Get After Approval</div>
      {[['✦ Verified Badge', 'A gold verification badge on your listing.'],
        ['📊 Analytics', 'Booking trends, views and engagement in real-time.'],
        ['💬 AI Review Responses', 'Let AI draft professional replies to your reviews.'],
        ['✏️ Full Listing Control', 'Edit services, pricing, images, and contact info.'],
      ].map(([title, desc]) => (
        <div key={title} style={{ ...ST.card, marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.gold, marginBottom: '0.25rem' }}>{title}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: '0.58rem', color: COLOR.textGhost }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function ClaimForm({ salonSearch, setSalonSearch, claiming, submitClaim, msg, msgOk }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <label style={{ fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.12em', color: COLOR.textGhost, display: 'block', marginBottom: '0.4rem' }}>SALON NAME</label>
        <input
          style={ST.input}
          placeholder="e.g. AAKAARAA SALON, B Blunt..."
          value={salonSearch}
          onChange={e => setSalonSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitClaim()}
        />
      </div>
      <button
        style={{ padding: '0.8rem', background: salonSearch.trim() ? 'linear-gradient(135deg,#D4AF37,#AA8A2A)' : 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.14em', fontWeight: 700, color: salonSearch.trim() ? '#000' : COLOR.textGhost, cursor: salonSearch.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
        onClick={submitClaim}
        disabled={claiming || !salonSearch.trim()}
      >
        {claiming ? '⟳ SUBMITTING...' : '✦ SUBMIT CLAIM REQUEST'}
      </button>
      {msg && (
        <div style={{ padding: '0.75rem', borderRadius: 7, background: msgOk ? 'rgba(76,175,80,0.08)' : 'rgba(239,83,80,0.08)', border: `1px solid ${msgOk ? 'rgba(76,175,80,0.25)' : 'rgba(239,83,80,0.25)'}`, fontFamily: FONT.body, fontSize: '0.8rem', color: msgOk ? '#81C784' : '#EF9A9A' }}>
          {msg}
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab({ token, hasAvatar, onAvatarRemoved, onDeleteAccount, deleting }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');
  const [msgErr, setMsgErr] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const changePassword = async () => {
    setBusy(true); setMsg(''); setMsgErr(false);
    try {
      const r = await fetch(`${API}/api/auth/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not change password');
      setMsg('✓ Password updated.'); setCurrent(''); setNext('');
    } catch (e) {
      setMsg(e.message); setMsgErr(true);
    } finally { setBusy(false); }
  };

  const removeAvatar = async () => {
    await fetch(`${API}/api/auth/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    onAvatarRemoved();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={ST.card}>
        <div style={{ fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.14em', color: COLOR.gold, marginBottom: '0.85rem' }}>SECURITY — CHANGE PASSWORD</div>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <input style={ST.input} type={showPass ? 'text' : 'password'} placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} />
          <button type="button" onClick={() => setShowPass(!showPass)} style={ST.showHide}>{showPass ? 'HIDE' : 'SHOW'}</button>
        </div>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <input style={ST.input} type={showPass ? 'text' : 'password'} placeholder="New password (8+ characters)" value={next} onChange={e => setNext(e.target.value)} />
          <button type="button" onClick={() => setShowPass(!showPass)} style={ST.showHide}>{showPass ? 'HIDE' : 'SHOW'}</button>
        </div>
        <button style={{ ...ST.goldBtn, opacity: (busy || !current || next.length < 8) ? 0.4 : 1 }} onClick={changePassword} disabled={busy || !current || next.length < 8}>
          {busy ? '⟳ Updating…' : '✓ Update Password'}
        </button>
        {msg && <p style={{ fontFamily: FONT.mono, fontSize: '0.58rem', color: msgErr ? '#EF9A9A' : '#81C784', marginTop: '0.5rem' }}>{msg}</p>}
      </div>

      {hasAvatar && (
        <div style={ST.card}>
          <div style={{ fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.14em', color: COLOR.textGhost, marginBottom: '0.75rem' }}>PROFILE PHOTO</div>
          <button style={ST.dangerBtn} onClick={removeAvatar}>Remove Profile Photo</button>
        </div>
      )}

      <div style={ST.card}>
        <div style={{ fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.14em', color: '#EF9A9A', marginBottom: '0.5rem' }}>DANGER ZONE</div>
        <p style={{ fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textGhost, marginBottom: '0.75rem', lineHeight: 1.5 }}>
          Permanently deletes your account and anonymizes your booking history. This cannot be undone.
        </p>
        <button style={ST.dangerBtn} onClick={onDeleteAccount} disabled={deleting}>
          {deleting ? '⟳ Deleting…' : 'Delete My Account'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MyAccount({ onClose }) {
  const { user, setUser } = useAura();
  const [data, setData]     = useState(null);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('overview');
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const token = localStorage.getItem('aura_token');

  const reloadProfile = () => {
    if (!token) { setError('Not logged in'); return; }
    fetch(`${API}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError(d.error || 'Could not load your account'); })
      .catch(() => setError('Could not load your account'));
  };
  useEffect(reloadProfile, [token]);

  const deleteAccount = async () => {
    if (!window.confirm('This permanently deletes your account and anonymizes your booking history. Continue?')) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/users`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      window.location.reload();
    } catch { setDeleting(false); }
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Image must be under 5MB.'); return; }
    setUploading(true); setUploadErr('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const r = await fetch(`${API}/api/auth/avatar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ imageBase64: ev.target.result }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Upload failed');
        localStorage.setItem('aura_user', JSON.stringify(d.user));
        reloadProfile();
      } catch (e) { setUploadErr(e.message); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;
  const progress = data ? xpProgress(data.user?.xp || 0) : null;

  // Detect shop claim status from user data (backend can enrich this)
  const shopStatus = data?.user?.shopClaimStatus || null;

  // Filter tabs — hide "My Shop" if admin
  const visibleTabs = user.role === 'admin' ? TABS.filter(t => t.id !== 'shop') : TABS;

  return (
    <motion.div
      style={ST.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Full-page panel sliding from right */}
      <motion.div
        style={ST.panel}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      >
        {/* ── Header ── */}
        <div style={ST.panelHeader}>
          <button style={ST.backBtn} onClick={onClose}>← Back</button>
          <div style={{ fontFamily: FONT.display, fontSize: '1.1rem', fontWeight: 300, color: COLOR.gold, letterSpacing: '0.12em' }}>My Profile</div>
          <div style={{ width: 60 }} />
        </div>

        <div style={ST.body}>
          {error && <div style={{ textAlign: 'center', padding: '2rem', fontFamily: FONT.mono, fontSize: '0.7rem', color: '#EF9A9A' }}>{error}</div>}
          {!data && !error && <div style={{ textAlign: 'center', padding: '3rem', fontFamily: FONT.mono, fontSize: '0.65rem', color: COLOR.textGhost }}>Loading your profile…</div>}

          {data && (
            <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
              {/* ── Left sidebar: avatar + nav ── */}
              <div style={ST.leftCol}>
                {/* Avatar */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={ST.avatarWrap} onClick={() => fileRef.current?.click()} title="Change profile photo">
                    {data.user.avatarUrl
                      ? <img src={data.user.avatarUrl} alt={data.user.name} style={ST.avatarImg} />
                      : <span style={ST.avatarInitial}>{data.user.name?.charAt(0).toUpperCase()}</span>}
                    <span style={ST.avatarEditBadge}>{uploading ? '…' : '✎'}</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarFile} />
                  {uploadErr && <p style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: '#EF9A9A', marginTop: '0.4rem' }}>{uploadErr}</p>}

                  <div style={{ fontFamily: FONT.display, fontSize: '1.25rem', fontWeight: 300, color: COLOR.textPrimary, marginTop: '0.75rem' }}>{data.user.name}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost, marginTop: '0.2rem', letterSpacing: '0.1em' }}>{data.user.email}</div>
                  {data.user.role !== 'user' && (
                    <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.25rem 0.75rem', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.15em', color: COLOR.gold }}>{data.user.role?.toUpperCase()}</div>
                  )}
                </div>

                {/* XP Bar */}
                {progress && (
                  <div style={{ marginBottom: '1.5rem', padding: '0.85rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.gold }}>LEVEL {progress.level} · {LEVEL_NAMES[progress.level]}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textGhost }}>{data.user.xp || 0} XP</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(212,175,55,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress.pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: 'linear-gradient(90deg,#D4AF37,#FFF2A8)', borderRadius: 2 }} />
                    </div>
                    {progress.remainingXp && <div style={{ fontFamily: FONT.mono, fontSize: '0.5rem', color: COLOR.textGhost, marginTop: '0.3rem', textAlign: 'right' }}>{progress.remainingXp} XP to Level {progress.nextLevel}</div>}
                  </div>
                )}

                {/* Tab Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {visibleTabs.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        ...ST.navBtn,
                        background: tab === t.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                        borderColor: tab === t.id ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.08)',
                        color: tab === t.id ? COLOR.gold : COLOR.textMuted,
                      }}
                    >
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* ── Right content ── */}
              <div style={ST.rightCol}>
                <NotificationBar role={data.user.role} shopStatus={shopStatus} />
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {tab === 'overview' && <OverviewTab data={data} progress={progress} />}
                    {tab === 'bookings' && <BookingsTab bookings={data.bookings} />}
                    {tab === 'ratings'  && <ReviewsTab ratings={data.ratings} />}
                    {tab === 'shop'     && <ShopTab user={data.user} token={token} />}
                    {tab === 'settings' && <SettingsTab token={token} hasAvatar={!!data.user.avatarUrl} onAvatarRemoved={reloadProfile} onDeleteAccount={deleteAccount} deleting={deleting} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Click-outside backdrop (narrow strip on left) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={onClose} />
    </motion.div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ST = {
  overlay: { position: 'fixed', inset: 0, zIndex: 920, display: 'flex', justifyContent: 'flex-end' },
  panel: {
    width: '100%', maxWidth: 900, height: '100vh',
    background: 'rgba(8,6,12,0.98)',
    borderLeft: '1px solid rgba(212,175,55,0.18)',
    boxShadow: '-40px 0 120px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column',
    backdropFilter: 'blur(30px)',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.5rem', borderBottom: '1px solid rgba(212,175,55,0.1)',
    background: 'rgba(4,3,6,0.9)', flexShrink: 0,
  },
  backBtn: {
    background: 'transparent', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6,
    color: COLOR.gold, fontFamily: FONT.mono, fontSize: '0.65rem', letterSpacing: '0.08em',
    cursor: 'pointer', padding: '0.4rem 0.85rem', transition: 'all 0.15s',
  },
  body: { flex: 1, overflowY: 'auto', padding: '1.5rem' },
  leftCol: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column' },
  rightCol: { flex: 1, minWidth: 0, overflowY: 'auto', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(212,175,55,0.07)' },

  avatarWrap: { position: 'relative', width: 88, height: 88, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(212,175,55,0.35)', background: 'rgba(212,175,55,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { fontFamily: FONT.display, fontSize: '2rem', color: COLOR.gold },
  avatarEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, background: 'rgba(0,0,0,0.8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff' },

  navBtn: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid transparent',
    fontFamily: FONT.body, fontSize: '0.85rem', cursor: 'pointer',
    textAlign: 'left', width: '100%', transition: 'all 0.15s',
  },

  sectionTitle: { fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: COLOR.textGhost, marginBottom: '0.85rem', textTransform: 'uppercase' },
  card: { padding: '1rem 1.1rem', background: 'rgba(212,175,55,0.025)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 10, marginBottom: '0.75rem' },
  empty: { fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textGhost, textAlign: 'center', padding: '2.5rem 0', lineHeight: 1.7 },

  statCard: { padding: '1rem', background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 10, textAlign: 'center' },
  statIcon: { fontSize: '1.25rem', marginBottom: '0.4rem' },
  statValue: { fontFamily: FONT.display, fontSize: '1.4rem', fontWeight: 300, color: COLOR.gold },
  statLabel: { fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.12em', color: COLOR.textGhost, marginTop: '0.2rem' },

  histRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid rgba(212,175,55,0.06)' },
  histIcon: { width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: COLOR.gold, flexShrink: 0 },
  histTitle: { fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary },
  histMeta: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textGhost, marginTop: '0.15rem' },
  badge: { padding: '0.2rem 0.55rem', borderRadius: 20, fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.1em' },

  input: { width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, outline: 'none', fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary, boxSizing: 'border-box' },
  showHide: { position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.1em', cursor: 'pointer' },
  goldBtn: { width: '100%', padding: '0.65rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.14em', fontWeight: 700, color: '#000', cursor: 'pointer' },
  dangerBtn: { width: '100%', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(239,83,80,0.35)', borderRadius: 7, fontFamily: FONT.mono, fontSize: '0.58rem', letterSpacing: '0.1em', color: '#EF9A9A', cursor: 'pointer' },
};