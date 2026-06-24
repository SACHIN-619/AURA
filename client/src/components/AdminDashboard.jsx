// AdminDashboard — internal-only platform overview, accessed at /admin.
// Real email/password login against /api/auth/login. The JWT returned is
// only useful here if the account's role is 'admin' in MongoDB — a normal
// user account will authenticate fine but get 403'd by every /api/admin/*
// call, so we check role client-side too for a clean error message instead
// of a confusing wall of failed requests.
import { useState, useEffect } from 'react';
import { API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';
import VerifiedBadge from './VerifiedBadge';
import VerifiedListingBadge from './VerifiedListingBadge';

export default function AdminDashboard() {
  const [token, setToken] = useState(sessionStorage.getItem('aura_admin_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [moderation, setModeration] = useState(null);
  const [dataGaps, setDataGaps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      if (d.user.role !== 'admin') {
        throw new Error('This account does not have admin access. Ask the operator to promote your role in the database.');
      }
      sessionStorage.setItem('aura_admin_token', d.token);
      setToken(d.token);
      fetchAll(d.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async (jwt) => {
    setLoading(true); setError('');
    try {
      const headers = { Authorization: `Bearer ${jwt}` };
      const [ov, bk, mod, gaps, an, unv] = await Promise.all([
        fetch(`${API}/api/admin/overview`, { headers }).then(r => r.json()),
        fetch(`${API}/api/admin/bookings`, { headers }).then(r => r.json()),
        fetch(`${API}/api/admin/moderation-queue`, { headers }).then(r => r.json()),
        fetch(`${API}/api/admin/data-gaps`, { headers }).then(r => r.json()),
        fetch(`${API}/api/admin/analytics`, { headers }).then(r => r.json()),
        fetch(`${API}/api/admin/listings/unverified`, { headers }).then(r => r.json()),
      ]);
      if (!ov.success) throw new Error(ov.error || 'Session expired — please log in again');
      setOverview(ov.overview);
      setBookings(bk.bookings || []);
      setModeration(mod);
      setDataGaps(gaps.hubs || []);
      setAnalytics(an.analytics || null);
      setUnverified(unv.salons || []);
    } catch (e) {
      setError(e.message);
      sessionStorage.removeItem('aura_admin_token');
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchAll(token); }, []); // eslint-disable-line

  const moderate = async (id, status) => {
    try {
      await fetch(`${API}/api/ratings/${id}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      fetchAll(token);
    } catch { /* surfaced via stale UI — acceptable for an internal tool */ }
  };

  const verifyListing = async (id, verified) => {
    try {
      await fetch(`${API}/api/admin/listings/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verified }),
      });
      fetchAll(token);
    } catch { /* acceptable for an internal tool */ }
  };

  const logout = () => { sessionStorage.removeItem('aura_admin_token'); setToken(''); };

  if (!token) {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginBox}>
          <div style={S.logo}>✦ AURA ADMIN</div>
          <input
            style={S.keyInput} type="email" placeholder="Admin email"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            style={S.keyInput} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          <button style={S.loginBtn} onClick={login} disabled={loading}>
            {loading ? 'Checking…' : 'Log in'}
          </button>
          {error && <p style={S.error}>{error}</p>}
          <p style={S.hint}>Sign up normally in the main app, then have an operator set your account's role to "admin" directly in MongoDB.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.logo}>✦ AURA ADMIN</div>
        <button style={S.logoutBtn} onClick={logout}>Log out</button>
      </div>

      <div style={S.tabs}>
        {['overview', 'analytics', 'moderation', 'listings', 'bookings', 'data gaps'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}>
            {t.toUpperCase()}
            {t === 'moderation' && moderation?.flagged?.length > 0 && <span style={S.badge}>{moderation.flagged.length}</span>}
            {t === 'listings' && unverified.length > 0 && <span style={S.badge}>{unverified.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div style={S.grid4}>
          <StatCard label="TOTAL SALONS" value={overview.totalSalons} />
          <StatCard label="HUBS SYNCED" value={overview.totalHubs} />
          <StatCard label="TOTAL BOOKINGS" value={overview.totalBookings} />
          <StatCard label="TOTAL USERS" value={overview.totalUsers} />
          <StatCard label="VISIBLE RATINGS" value={overview.totalRatings} />
          <StatCard label="FLAGGED RATINGS" value={overview.pendingFlagged} warn={overview.pendingFlagged > 0} />
          <StatCard label="% WITH CATEGORY DATA" value={`${overview.dataCoverage.withCategories}%`} />
          <StatCard label="% WITH CONTACT INFO" value={`${overview.dataCoverage.withContact}%`} />
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div>
          <div style={S.grid4}>
            <StatCard label="VIEWS (30d)" value={analytics.eventCounts.views} />
            <StatCard label="ROUTE CLICKS" value={analytics.eventCounts.routeClicks} />
            <StatCard label="AI SEARCHES" value={analytics.eventCounts.aiSearches} />
            <StatCard label="MIRROR USES" value={analytics.eventCounts.mirrorUses} />
            <StatCard label="BOOKINGS" value={analytics.eventCounts.bookings} />
            <StatCard label="CONVERSION RATE" value={analytics.conversionRate === null ? 'Not enough data' : `${analytics.conversionRate}%`} />
          </div>
          <h3 style={{ ...S.sectionTitle, marginTop: '1.5rem' }}>Top viewed salons (30 days)</h3>
          {analytics.topViewedSalons.length === 0 && <p style={S.empty}>No view data yet.</p>}
          {analytics.topViewedSalons.map(s => (
            <div key={s._id} style={S.gapRow}>
              <div style={S.bName}>{s.name} · {s.hub}</div>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.42rem', color: COLOR.gold }}>{s.views} views</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && moderation && (
        <div>
          <h3 style={S.sectionTitle}>Flagged ratings ({moderation.flagged.length})</h3>
          {moderation.flagged.length === 0 && <p style={S.empty}>Nothing flagged right now.</p>}
          {moderation.flagged.map(r => <RatingRow key={r._id} r={r} onModerate={moderate} />)}

          <h3 style={{ ...S.sectionTitle, marginTop: '1.5rem' }}>Low-star ratings (1–2★, for awareness)</h3>
          {moderation.lowStars.length === 0 && <p style={S.empty}>None.</p>}
          {moderation.lowStars.map(r => <RatingRow key={r._id} r={r} onModerate={moderate} />)}
        </div>
      )}

      {tab === 'listings' && (
        <div>
          <p style={{ ...S.empty, textAlign: 'left', marginBottom: '1rem' }}>
            Confirming a listing means you've personally verified this salon's name, address, and contact info are accurate (e.g. by calling the number or checking their website). This is separate from rating verification.
          </p>
          {unverified.length === 0 && <p style={S.empty}>All synced salons are verified, or none have enough info yet.</p>}
          {unverified.map(s => (
            <div key={s._id} style={S.listingRow}>
              <div style={{ flex: 1 }}>
                <div style={S.bName}>{s.name}</div>
                <div style={S.bMeta}>{s.hub} · {s.address?.suburb || 'No suburb listed'}</div>
                <div style={S.bMeta}>{s.contact?.phone || 'No phone'} · {s.contact?.website || 'No website'}</div>
                <div style={S.bMeta}>{(s.serviceCategories || []).join(', ') || 'No categories tagged'}</div>
              </div>
              <button style={S.verifyBtn} onClick={() => verifyListing(s._id, true)}>
                <VerifiedListingBadge size={13} /> Mark verified
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div style={S.table}>
          {bookings.map(b => (
            <div key={b._id} style={S.bookingRow}>
              <div>
                <div style={S.bName}>{b.salonName}</div>
                <div style={S.bMeta}>{b.salonHub} · {b.customerName} ({b.customerEmail})</div>
              </div>
              <div style={S.bRight}>
                <div style={S.bService}>{b.service}</div>
                <div style={S.bMeta}>{b.date} · {b.timeSlot}</div>
                <span style={{ ...S.statusPip, color: b.status === 'cancelled' ? '#EF5350' : '#4CAF50' }}>{b.status}</span>
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p style={S.empty}>No bookings yet.</p>}
        </div>
      )}

      {tab === 'data gaps' && (
        <div style={S.table}>
          {dataGaps.map(h => (
            <div key={h._id} style={S.gapRow}>
              <div style={S.bName}>{h._id}</div>
              <div style={S.gapStats}>
                <span>{h.count} salons</span>
                <span style={{ color: h.withCategories / h.count < 0.3 ? '#EF5350' : COLOR.textMuted }}>
                  {Math.round((h.withCategories / h.count) * 100)}% categorized
                </span>
                <span style={{ color: h.withPhone / h.count < 0.3 ? '#EF5350' : COLOR.textMuted }}>
                  {Math.round((h.withPhone / h.count) * 100)}% have phone
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, warn }) {
  return (
    <div style={{ ...S.statCard, ...(warn ? S.statCardWarn : {}) }}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: warn ? '#EF5350' : COLOR.gold }}>{value}</div>
    </div>
  );
}

function RatingRow({ r, onModerate }) {
  return (
    <div style={S.ratingRow}>
      <div style={{ flex: 1 }}>
        <div style={S.bName}>
          {r.salonId?.name || 'Unknown salon'} · {r.salonId?.hub || ''}
          {r.isVerified && <VerifiedBadge size={12} />}
        </div>
        <div style={S.bMeta}>{r.customerName} · {'★'.repeat(r.stars)} · {new Date(r.createdAt).toLocaleDateString()}</div>
        {r.comment && <p style={S.comment}>{r.comment}</p>}
      </div>
      <div style={S.actions}>
        <button style={S.actBtn} onClick={() => onModerate(r._id, 'visible')}>Keep visible</button>
        <button style={{ ...S.actBtn, color: '#EF5350' }} onClick={() => onModerate(r._id, 'hidden')}>Hide</button>
      </div>
    </div>
  );
}

const S = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030204' },
  loginBox:  { width: 320, padding: '2rem', background: 'rgba(18,14,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12 },
  logo:      { fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.2em', color: COLOR.gold, marginBottom: '1.2rem', textAlign: 'center' },
  keyInput:  { width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLOR.textPrimary, marginBottom: '0.8rem', boxSizing: 'border-box' },
  loginBtn:  { width: '100%', padding: '0.6rem', background: COLOR.gold, border: 'none', borderRadius: 6, color: '#000', fontFamily: FONT.mono, fontSize: '0.46rem', letterSpacing: '0.16em', cursor: 'pointer' },
  error:     { color: '#EF5350', fontFamily: FONT.mono, fontSize: '0.42rem', marginTop: '0.6rem', textAlign: 'center' },
  hint:      { color: COLOR.textGhost, fontFamily: FONT.mono, fontSize: '0.38rem', marginTop: '1rem', textAlign: 'center', lineHeight: 1.6 },
  wrap:      { minHeight: '100vh', background: '#030204', padding: '1.5rem', color: COLOR.textPrimary, fontFamily: FONT.body },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  logoutBtn: { background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: COLOR.textMuted, padding: '0.4rem 0.9rem', fontFamily: FONT.mono, fontSize: '0.42rem', cursor: 'pointer' },
  tabs:      { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab:       { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 6, color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.42rem', letterSpacing: '0.1em', cursor: 'pointer', position: 'relative' },
  tabActive: { borderColor: 'rgba(212,175,55,0.5)', color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  badge:     { marginLeft: 6, background: '#EF5350', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.6rem' },
  grid4:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.8rem' },
  statCard:  { padding: '1rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 8 },
  statCardWarn: { borderColor: 'rgba(239,83,80,0.3)' },
  statLabel: { fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.12em', color: COLOR.textGhost, marginBottom: '0.4rem' },
  statValue: { fontFamily: FONT.display, fontSize: '1.6rem' },
  sectionTitle: { fontFamily: FONT.display, fontSize: '1.1rem', fontWeight: 300, marginBottom: '0.7rem' },
  empty:     { color: COLOR.textGhost, fontFamily: FONT.mono, fontSize: '0.42rem' },
  table:     { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  bookingRow:{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)' },
  ratingRow: { display: 'flex', gap: '1rem', padding: '0.8rem', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', marginBottom: '0.6rem', alignItems: 'flex-start' },
  listingRow:{ display: 'flex', gap: '1rem', padding: '0.8rem', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', marginBottom: '0.6rem', alignItems: 'center' },
  verifyBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.8rem', background: 'rgba(43,163,154,0.1)', border: '1px solid rgba(43,163,154,0.35)', borderRadius: 6, color: '#7FE3D8', fontFamily: FONT.mono, fontSize: '0.4rem', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  bName:     { fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' },
  bMeta:     { fontFamily: FONT.mono, fontSize: '0.4rem', color: COLOR.textGhost, marginTop: '0.2rem' },
  bRight:    { textAlign: 'right' },
  bService:  { fontSize: '0.8rem', color: COLOR.gold },
  statusPip: { fontFamily: FONT.mono, fontSize: '0.38rem', letterSpacing: '0.1em' },
  comment:   { fontSize: '0.78rem', color: COLOR.textMuted, marginTop: '0.4rem' },
  actions:   { display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 },
  actBtn:    { background: 'none', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 5, padding: '0.3rem 0.6rem', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.38rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  gapRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem', background: 'rgba(212,175,55,0.03)', borderRadius: 8 },
  gapStats:  { display: 'flex', gap: '1rem', fontFamily: FONT.mono, fontSize: '0.42rem', color: COLOR.textMuted },
};
