// AdminDashboard — internal-only platform overview, accessed at /admin.
// Real email/password login against /api/auth/login. The JWT returned is
// only useful here if the account's role is 'admin' in MongoDB — a normal
// user account will authenticate fine but get 403'd by every /api/admin/*
// call, so we check role client-side too for a clean error message.
import { useState, useEffect, useCallback } from 'react';
import { API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';
import VerifiedBadge from './VerifiedBadge';
import VerifiedListingBadge from './VerifiedListingBadge';

// ─── Default service categories admin can use ───────────────────────────────
const DEFAULT_CATEGORIES = [
  'Hair Care', 'Haircut', 'Hair Colour', 'Keratin Treatment', 'Blowout',
  'Beard Trim', 'Shave', 'Facial', 'Skin Care', 'Waxing', 'Threading',
  'Eyebrows', 'Nail Art', 'Manicure', 'Pedicure', 'Massage', 'Spa',
  'Bridal', 'Mehendi', 'Makeup', 'Tattoo', 'Piercing', 'Laser',
  'Hair Extensions', 'Scalp Treatment', 'Aromatherapy',
];

const ALL_TABS = ['overview','analytics','salons','claims','moderation','listings','bookings','data gaps','activity','expansion','reports','users'];

export default function AdminDashboard() {
  const [token,      setToken]      = useState(localStorage.getItem('aura_token') || '');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [overview,   setOverview]   = useState(null);
  const [bookings,   setBookings]   = useState([]);
  const [moderation, setModeration] = useState(null);
  const [dataGaps,   setDataGaps]   = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [activity,   setActivity]   = useState([]);
  const [reports,    setReports]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [claims,     setClaims]     = useState([]);
  const [allSalons,  setAllSalons]  = useState([]);
  const [nullSearches, setNullSearches] = useState([]);
  const [tab,        setTab]        = useState('overview');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [toast,      setToast]      = useState('');

  // Listings tab state
  const [listingView,   setListingView]   = useState('unverified'); // 'unverified' | 'all'
  const [salonSearch,   setSalonSearch]   = useState('');
  const [hubFilter,     setHubFilter]     = useState('');
  const [disabledFilter, setDisabledFilter] = useState('');
  const [editSalon,     setEditSalon]     = useState(null); // salon being edited in modal
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const authH = (jwt) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` });

  const login = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      if (d.user.role !== 'admin')
        throw new Error('This account does not have admin access. Ask the operator to promote your role in MongoDB.');
      localStorage.setItem('aura_token', d.token);
      localStorage.setItem('aura_user', JSON.stringify(d.user));
      setToken(d.token);
      fetchAll(d.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchAll = useCallback(async (jwt) => {
    setLoading(true); setError('');
    try {
      const h = authH(jwt);
      const [ov, bk, mod, gaps, an, unv, act, reps, usr, clm, ns, allS] = await Promise.all([
        fetch(`${API}/api/admin/overview`,          { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/bookings`,          { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/moderation-queue`,  { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/data-gaps`,         { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/analytics`,         { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/listings/unverified`,{ headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/activity`,          { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/reports`,           { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/users`,             { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/claims?status=pending`,{ headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/null-searches`,     { headers: h }).then(r => r.json()),
        fetch(`${API}/api/admin/salons?limit=30`,   { headers: h }).then(r => r.json()),
      ]);
      if (!ov.success) throw new Error(ov.error || 'Session expired — please log in again');
      setOverview(ov.overview);
      setBookings(bk.bookings || []);
      setModeration(mod);
      setDataGaps(gaps.hubs || []);
      setAnalytics(an.analytics || null);
      setUnverified(unv.salons || []);
      setActivity(act.stream || []);
      setReports(reps.salons || []);
      setUsers(usr.users || []);
      setClaims(clm.claims || []);
      setNullSearches(ns.nullSearches || []);
      setAllSalons(allS.salons || []);
    } catch (e) {
      setError(e.message);
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      setToken('');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) fetchAll(token); }, []); // eslint-disable-line

  // ─── Fetch all salons with current filters (for the Salons tab) ────────────
  const fetchAllSalons = async () => {
    try {
      const params = new URLSearchParams({ search: salonSearch, hub: hubFilter, limit: 50 });
      if (disabledFilter) params.set('disabled', disabledFilter);
      const r = await fetch(`${API}/api/admin/salons?${params}`, { headers: authH(token) });
      const d = await r.json();
      if (d.success) setAllSalons(d.salons || []);
    } catch { /* non-critical */ }
  };

  // ─── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (salon) => {
    setEditSalon(salon);
    setEditForm({
      name:              salon.name || '',
      hub:               salon.hub  || '',
      description:       salon.description || '',
      openingHours:      salon.openingHours || '',
      contactPhone:      salon.contact?.phone || '',
      contactWebsite:    salon.contact?.website || '',
      contactEmail:      salon.contact?.email || '',
      contactWhatsapp:   salon.contact?.whatsapp || '',
      addressStreet:     salon.address?.street || '',
      addressSuburb:     salon.address?.suburb || '',
      addressPostcode:   salon.address?.postcode || '',
      serviceCategories: (salon.serviceCategories || []).join(', '),
      customTags:        (salon.customTags || []).join(', '),
      servesGender:      salon.servesGender || '',
      priceTier:         salon.priceTier || '',
      tier:              salon.tier || 'unrated',
      isFeatured:        salon.isFeatured || false,
      banner:            salon.images?.banner || '',
      thumbnail:         salon.images?.thumbnail || '',
      gallery:           (salon.images?.gallery || []).join('\n'),
    });
  };

  const saveEdit = async () => {
    if (!editSalon) return;
    setEditSaving(true);
    try {
      const body = {
        name:               editForm.name,
        hub:                editForm.hub,
        description:        editForm.description,
        openingHours:       editForm.openingHours,
        contact: {
          phone:    editForm.contactPhone,
          website:  editForm.contactWebsite,
          email:    editForm.contactEmail,
          whatsapp: editForm.contactWhatsapp,
        },
        address: {
          street:   editForm.addressStreet,
          suburb:   editForm.addressSuburb,
          postcode: editForm.addressPostcode,
          city:     'Hyderabad',
          state:    'Telangana',
        },
        serviceCategories: editForm.serviceCategories.split(',').map(s => s.trim()).filter(Boolean),
        customTags:        editForm.customTags.split(',').map(s => s.trim()).filter(Boolean),
        servesGender:      editForm.servesGender || null,
        priceTier:         editForm.priceTier || null,
        tier:              editForm.tier,
        isFeatured:        editForm.isFeatured,
        images: {
          banner:    editForm.banner,
          thumbnail: editForm.thumbnail,
          gallery:   editForm.gallery.split('\n').map(s => s.trim()).filter(Boolean),
        },
      };
      const r = await fetch(`${API}/api/admin/salons/${editSalon._id}`, {
        method: 'PATCH', headers: authH(token), body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      showToast(`✓ ${d.message}`);
      setEditSalon(null);
      fetchAllSalons();
    } catch (e) { showToast(`✗ ${e.message}`); }
    finally { setEditSaving(false); }
  };

  // ─── Toggle salon disabled ─────────────────────────────────────────────────
  const toggleSalonDisabled = async (salon) => {
    const newDisabled = !salon.disabled;
    const reason = newDisabled ? (prompt('Reason for disabling (optional):') ?? '') : '';
    if (newDisabled && reason === null) return; // user cancelled
    try {
      const r = await fetch(`${API}/api/admin/salons/${salon._id}/disabled`, {
        method: 'PATCH', headers: authH(token), body: JSON.stringify({ disabled: newDisabled, reason }),
      });
      const d = await r.json();
      showToast(d.message || (newDisabled ? 'Salon hidden.' : 'Salon live.'));
      fetchAllSalons();
    } catch { showToast('Action failed — please retry.'); }
  };

  // ─── Toggle user disabled ──────────────────────────────────────────────────
  const toggleUserDisabled = async (user) => {
    const newDisabled = !user.disabled;
    if (newDisabled && !window.confirm(`Suspend ${user.name}'s account? They will be unable to log in.`)) return;
    try {
      const r = await fetch(`${API}/api/admin/users/${user._id}/disabled`, {
        method: 'PATCH', headers: authH(token), body: JSON.stringify({ disabled: newDisabled }),
      });
      const d = await r.json();
      showToast(d.message);
      fetchAll(token);
    } catch { showToast('Action failed — please retry.'); }
  };

  const moderate = async (id, status) => {
    try {
      await fetch(`${API}/api/ratings/${id}/moderate`, {
        method: 'PATCH', headers: authH(token), body: JSON.stringify({ status }),
      });
      fetchAll(token);
    } catch { /* surfaced via stale UI */ }
  };

  const verifyListing = async (id, verified) => {
    try {
      await fetch(`${API}/api/admin/listings/${id}/verify`, {
        method: 'PATCH', headers: authH(token), body: JSON.stringify({ verified }),
      });
      fetchAll(token);
    } catch { /* acceptable for an internal tool */ }
  };

  const changeUserRole = async (userId, newRole) => {
    const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
      method: 'PATCH', headers: authH(token), body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (data.success) { fetchAll(token); showToast('Role updated.'); }
    else showToast(data.error || 'Failed to update role');
  };

  const respondToClaim = async (claimId, status, message) => {
    const res = await fetch(`${API}/api/admin/claims/${claimId}/respond`, {
      method: 'POST', headers: authH(token), body: JSON.stringify({ status, message }),
    });
    const data = await res.json();
    if (data.success) { fetchAll(token); showToast(`Claim ${status}.`); }
    else showToast(data.error || 'Failed to respond to claim');
  };

  const dismissReport = async (salonId, reportId, action) => {
    const r = await fetch(`${API}/api/admin/salons/${salonId}/reports/${reportId}`, {
      method: 'PATCH', headers: authH(token), body: JSON.stringify({ action }),
    });
    const d = await r.json();
    showToast(d.message || 'Done');
    fetchAll(token);
  };

  const logout = () => {
    localStorage.removeItem('aura_token'); localStorage.removeItem('aura_user');
    setToken(''); window.location.href = '/';
  };

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={S.loginWrap}>
        <div style={S.loginBox}>
          <div style={S.logo}>✦ AURA ADMIN</div>
          <input style={S.keyInput} type="email" placeholder="Admin email"
            value={email} onChange={e => setEmail(e.target.value)} />
          <div style={{ position: 'relative', width: '100%', marginBottom: '0.8rem' }}>
            <input
              style={{ ...S.keyInput, marginBottom: 0, paddingRight: '3.5rem' }}
              type={showPass ? 'text' : 'password'} placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={S.showHideBtn}>
              {showPass ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <button style={S.loginBtn} onClick={login} disabled={loading}>
            {loading ? 'Checking…' : 'Log In'}
          </button>
          {error && <p style={S.error}>{error}</p>}
          <p style={S.hint}>Sign up normally in the main app, then have an operator set your account's role to "admin" directly in MongoDB.</p>
        </div>
      </div>
    );
  }

  const hubs = [...new Set(allSalons.map(s => s.hub).filter(Boolean))].sort();

  // ─── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      {/* Toast notification */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}

      {/* Edit Salon Modal */}
      {editSalon && (
        <div style={S.modalOverlay} onClick={() => setEditSalon(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: COLOR.gold }}>EDITING SALON</span>
              <button style={S.closeBtn} onClick={() => setEditSalon(null)}>✕</button>
            </div>
            <div style={S.modalBody}>
              {/* Basic Info */}
              <FieldGroup label="BASIC INFORMATION">
                <EditRow label="Name">
                  <input style={S.inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </EditRow>
                <EditRow label="Hub / Area">
                  <input style={S.inp} value={editForm.hub} onChange={e => setEditForm(f => ({ ...f, hub: e.target.value }))} placeholder="e.g. Banjara Hills" />
                </EditRow>
                <EditRow label="Description">
                  <textarea style={{ ...S.inp, height: 70, resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </EditRow>
                <EditRow label="Opening Hours">
                  <input style={S.inp} value={editForm.openingHours} onChange={e => setEditForm(f => ({ ...f, openingHours: e.target.value }))} placeholder="e.g. Mon–Sat 9am–8pm" />
                </EditRow>
              </FieldGroup>

              {/* Contact */}
              <FieldGroup label="CONTACT DETAILS">
                <EditRow label="Phone"><input style={S.inp} value={editForm.contactPhone} onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+91 90000 00000" /></EditRow>
                <EditRow label="WhatsApp"><input style={S.inp} value={editForm.contactWhatsapp} onChange={e => setEditForm(f => ({ ...f, contactWhatsapp: e.target.value }))} /></EditRow>
                <EditRow label="Website"><input style={S.inp} value={editForm.contactWebsite} onChange={e => setEditForm(f => ({ ...f, contactWebsite: e.target.value }))} placeholder="https://…" /></EditRow>
                <EditRow label="Email"><input style={S.inp} value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} /></EditRow>
              </FieldGroup>

              {/* Address */}
              <FieldGroup label="ADDRESS">
                <EditRow label="Street"><input style={S.inp} value={editForm.addressStreet} onChange={e => setEditForm(f => ({ ...f, addressStreet: e.target.value }))} /></EditRow>
                <EditRow label="Suburb"><input style={S.inp} value={editForm.addressSuburb} onChange={e => setEditForm(f => ({ ...f, addressSuburb: e.target.value }))} /></EditRow>
                <EditRow label="Pincode"><input style={S.inp} value={editForm.addressPostcode} onChange={e => setEditForm(f => ({ ...f, addressPostcode: e.target.value }))} /></EditRow>
              </FieldGroup>

              {/* Categories */}
              <FieldGroup label="SERVICE CATEGORIES">
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost, marginBottom: '0.4rem' }}>
                    Quick-add (click to toggle):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {DEFAULT_CATEGORIES.map(cat => {
                      const active = editForm.serviceCategories.toLowerCase().includes(cat.toLowerCase());
                      return (
                        <button key={cat} onClick={() => {
                          const cats = editForm.serviceCategories.split(',').map(s => s.trim()).filter(Boolean);
                          const newCats = active ? cats.filter(c => c.toLowerCase() !== cat.toLowerCase()) : [...cats, cat];
                          setEditForm(f => ({ ...f, serviceCategories: newCats.join(', ') }));
                        }} style={{ ...S.catChip, ...(active ? S.catChipActive : {}) }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <EditRow label="Custom tags (comma-sep)">
                  <input style={S.inp} value={editForm.customTags} onChange={e => setEditForm(f => ({ ...f, customTags: e.target.value }))} placeholder="e.g. Luxury, Walk-in" />
                </EditRow>
              </FieldGroup>

              {/* Classification */}
              <FieldGroup label="CLASSIFICATION">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <EditRow label="Serves">
                    <select style={S.sel} value={editForm.servesGender} onChange={e => setEditForm(f => ({ ...f, servesGender: e.target.value }))}>
                      <option value="">Any</option>
                      <option value="unisex">Unisex</option>
                      <option value="female">Female only</option>
                      <option value="male">Male only</option>
                    </select>
                  </EditRow>
                  <EditRow label="Price tier">
                    <select style={S.sel} value={editForm.priceTier} onChange={e => setEditForm(f => ({ ...f, priceTier: e.target.value }))}>
                      <option value="">Not set</option>
                      <option value="Budget">Budget</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Premium Luxury">Premium Luxury</option>
                    </select>
                  </EditRow>
                  <EditRow label="Tier">
                    <select style={S.sel} value={editForm.tier} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))}>
                      <option value="unrated">Unrated</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </EditRow>
                  <EditRow label="Featured">
                    <select style={S.sel} value={editForm.isFeatured ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, isFeatured: e.target.value === 'true' }))}>
                      <option value="false">No</option>
                      <option value="true">Yes — Featured</option>
                    </select>
                  </EditRow>
                </div>
              </FieldGroup>

              {/* Images */}
              <FieldGroup label="IMAGES">
                <EditRow label="Banner URL"><input style={S.inp} value={editForm.banner} onChange={e => setEditForm(f => ({ ...f, banner: e.target.value }))} placeholder="https://…" /></EditRow>
                <EditRow label="Thumbnail URL"><input style={S.inp} value={editForm.thumbnail} onChange={e => setEditForm(f => ({ ...f, thumbnail: e.target.value }))} placeholder="https://…" /></EditRow>
                <EditRow label="Gallery URLs (one per line)">
                  <textarea style={{ ...S.inp, height: 80, resize: 'vertical', fontFamily: FONT.mono, fontSize: '0.72rem' }}
                    value={editForm.gallery}
                    onChange={e => setEditForm(f => ({ ...f, gallery: e.target.value }))}
                    placeholder={"https://url1.jpg\nhttps://url2.jpg"}
                  />
                </EditRow>
                {/* Gallery preview */}
                {editForm.gallery && (
                  <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                    {editForm.gallery.split('\n').map(s => s.trim()).filter(Boolean).map((url, i) => (
                      <img key={i} src={url} alt={`Gallery ${i+1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        onError={e => { e.target.style.display='none'; }} />
                    ))}
                  </div>
                )}
              </FieldGroup>
            </div>

            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={() => setEditSalon(null)}>Cancel</button>
              <button style={{ ...S.saveBtn, opacity: editSaving ? 0.6 : 1 }} onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>✦ AURA ADMIN</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {loading && <span style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: COLOR.textGhost }}>loading…</span>}
          <button style={S.logoutBtn} onClick={logout}>Log Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs} className="admin-tabs-scroll">
        {ALL_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}>
            {t.toUpperCase()}
            {t === 'moderation' && moderation?.flagged?.length > 0 && <span style={S.badge}>{moderation.flagged.length}</span>}
            {t === 'listings'   && unverified.length > 0             && <span style={S.badge}>{unverified.length}</span>}
            {t === 'reports'    && reports.length > 0                && <span style={S.badge}>{reports.length}</span>}
            {t === 'claims'     && claims.length > 0                 && <span style={S.badge}>{claims.length}</span>}
            {t === 'expansion'  && nullSearches.length > 0           && <span style={{ ...S.badge, background: '#F57C00' }}>{nullSearches.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {tab === 'overview' && overview && (
        <div style={S.grid4}>
          <StatCard label="TOTAL SALONS"    value={overview.totalSalons}   onClick={() => setTab('salons')} />
          <StatCard label="HUBS SYNCED"     value={overview.totalHubs}     onClick={() => setTab('data gaps')} />
          <StatCard label="TOTAL BOOKINGS"  value={overview.totalBookings} onClick={() => setTab('bookings')} />
          <StatCard label="TOTAL USERS"     value={overview.totalUsers}    onClick={() => setTab('users')} />
          <StatCard label="VISIBLE RATINGS" value={overview.totalRatings}  onClick={() => setTab('moderation')} />
          <StatCard label="FLAGGED RATINGS" value={overview.pendingFlagged} warn={overview.pendingFlagged > 0} onClick={() => setTab('moderation')} />
          <StatCard label="% CATEGORIZED"   value={`${overview.dataCoverage?.withCategories || 0}%`} />
          <StatCard label="% WITH CONTACT"  value={`${overview.dataCoverage?.withContact || 0}%`} />
          {nullSearches.length > 0 && (
            <StatCard label="UNSERVED AREAS (30d)" value={nullSearches.length} warn onClick={() => setTab('expansion')} />
          )}
        </div>
      )}

      {/* ── ANALYTICS ────────────────────────────────────────────────────────── */}
      {tab === 'analytics' && analytics && (
        <div>
          <div style={S.grid4}>
            <StatCard label="VIEWS (30d)"      value={analytics.eventCounts.views} />
            <StatCard label="ROUTE CLICKS"     value={analytics.eventCounts.routeClicks} />
            <StatCard label="AI SEARCHES"      value={analytics.eventCounts.aiSearches} />
            <StatCard label="MIRROR USES"      value={analytics.eventCounts.mirrorUses} />
            <StatCard label="BOOKINGS"         value={analytics.eventCounts.bookings} />
            <StatCard label="CONVERSION RATE"  value={analytics.conversionRate === null ? 'Not enough data' : `${analytics.conversionRate}%`} />
          </div>
          <h3 style={{ ...S.sectionTitle, marginTop: '1.5rem' }}>Top viewed salons (30 days)</h3>
          {analytics.topViewedSalons.length === 0 && <p style={S.empty}>No view data yet.</p>}
          {analytics.topViewedSalons.map(s => (
            <div key={s._id} style={S.gapRow}>
              <div style={S.bName}>{s.name} · {s.hub}</div>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.75rem', color: COLOR.gold }}>{s.views} views</span>
            </div>
          ))}
        </div>
      )}

      {/* ── SALONS (ALL) ─────────────────────────────────────────────────────── */}
      {tab === 'salons' && (
        <div>
          <div style={S.searchBar}>
            <input style={{ ...S.inp, flex: 1 }} placeholder="Search by name or area…"
              value={salonSearch} onChange={e => setSalonSearch(e.target.value)} />
            <select style={S.sel} value={hubFilter} onChange={e => setHubFilter(e.target.value)}>
              <option value="">All Hubs</option>
              {hubs.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <select style={S.sel} value={disabledFilter} onChange={e => setDisabledFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="false">Live only</option>
              <option value="true">Disabled only</option>
            </select>
            <button style={S.filterBtn} onClick={fetchAllSalons}>Search</button>
          </div>
          <div style={S.tableList}>
            {allSalons.length === 0 && <p style={S.empty}>No salons found. Run a search above.</p>}
            {allSalons.map(s => (
              <div key={s._id} style={{ ...S.salonRow, opacity: s.disabled ? 0.5 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={S.bName}>{s.name}</div>
                    {s.disabled && <span style={S.disabledBadge}>HIDDEN</span>}
                    {s.listingVerified && <VerifiedListingBadge size={12} />}
                    {s.claimStatus === 'approved' && <span style={S.ownedBadge}>OWNED</span>}
                  </div>
                  <div style={S.bMeta}>{s.hub} · {s.address?.suburb || s.address?.city || 'No address'}</div>
                  <div style={S.bMeta}>{s.contact?.phone || 'No phone'} · {s.contact?.website || 'No website'}</div>
                  <div style={S.bMeta}>{(s.serviceCategories || []).slice(0, 4).join(', ') || 'No categories'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button style={S.editBtn} onClick={() => openEdit(s)}>✎ Edit</button>
                  <button
                    style={{ ...S.editBtn, color: s.disabled ? '#81C784' : '#EF9A9A', borderColor: s.disabled ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)' }}
                    onClick={() => toggleSalonDisabled(s)}
                  >
                    {s.disabled ? '⊕ Restore' : '⊖ Disable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CLAIMS ───────────────────────────────────────────────────────────── */}
      {tab === 'claims' && (
        <div>
          <h3 style={S.sectionTitle}>Pending Shop Claims ({claims.length})</h3>
          {claims.length === 0 && <p style={S.empty}>No pending claims. All caught up! ✓</p>}
          {claims.map(c => (
            <div key={c._id} style={{ ...S.ratingRow, flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={S.bName}>{c.user?.name} <span style={S.bMeta}>({c.user?.email})</span></div>
                  <div style={S.bMeta}>Requesting to claim salon:</div>
                  <div style={{ ...S.bName, color: COLOR.gold, marginTop: '0.2rem' }}>{c.salon?.name || 'Unknown Salon'}</div>
                  <div style={S.bMeta}>Hub: {c.salon?.hub || 'Unknown'}</div>
                  {c.user?.totalBookings > 0 && <div style={{ ...S.bMeta, color: '#A5D6A7' }}>✓ {c.user.totalBookings} bookings on platform (trust signal)</div>}
                </div>
                <div style={S.bRight}>
                  <div style={S.bMeta}>{new Date(c.createdAt).toLocaleDateString()}</div>
                  <span style={{ ...S.statusPip, color: '#90CAF9' }}>{c.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  style={{ ...S.actBtn, background: 'rgba(76,175,80,0.1)', color: '#81C784', borderColor: 'rgba(76,175,80,0.3)' }}
                  onClick={() => {
                    const msg = prompt('Optional welcome message for the shop owner:');
                    if (msg !== null) respondToClaim(c._id, 'approved', msg);
                  }}
                >✓ Approve Claim</button>
                <button
                  style={{ ...S.actBtn, background: 'rgba(239,83,80,0.1)', color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.3)' }}
                  onClick={() => {
                    const msg = prompt('Reason for rejection (shown to user):');
                    if (msg !== null) respondToClaim(c._id, 'rejected', msg || 'Could not verify ownership.');
                  }}
                >✕ Reject Claim</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODERATION ───────────────────────────────────────────────────────── */}
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

      {/* ── LISTINGS (UNVERIFIED) ─────────────────────────────────────────────── */}
      {tab === 'listings' && (
        <div>
          <p style={{ ...S.empty, textAlign: 'left', marginBottom: '1rem' }}>
            Confirming a listing means you've personally verified this salon's name, address, and contact info are accurate. This is separate from rating verification.
          </p>
          {unverified.length === 0 && <p style={S.empty}>All synced salons are verified, or none have enough info yet.</p>}
          {unverified.map(s => (
            <div key={s._id} style={S.listingRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.bName}>{s.name}</div>
                <div style={S.bMeta}>{s.hub} · {s.address?.suburb || 'No suburb'}</div>
                <div style={S.bMeta}>{s.contact?.phone || 'No phone'} · {s.contact?.website || 'No website'}</div>
                <div style={S.bMeta}>{(s.serviceCategories || []).join(', ') || 'No categories'}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button style={S.verifyBtn} onClick={() => verifyListing(s._id, true)}>
                  <VerifiedListingBadge size={13} /> Verify
                </button>
                <button style={S.editBtn} onClick={() => { openEdit(s); }}>✎ Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BOOKINGS ─────────────────────────────────────────────────────────── */}
      {tab === 'bookings' && (
        <div style={S.tableList}>
          {bookings.map(b => (
            <div key={b._id} style={S.bookingRow}>
              <div style={{ minWidth: 0 }}>
                <div style={S.bName}>{b.salonName}</div>
                <div style={S.bMeta}>{b.salonHub} · {b.customerName} ({b.customerEmail})</div>
              </div>
              <div style={{ ...S.bRight, flexShrink: 0 }}>
                <div style={S.bService}>{b.service}</div>
                <div style={S.bMeta}>{b.date} · {b.timeSlot}</div>
                <span style={{ ...S.statusPip, color: b.status === 'cancelled' ? '#EF5350' : '#4CAF50' }}>{b.status}</span>
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p style={S.empty}>No bookings yet.</p>}
        </div>
      )}

      {/* ── DATA GAPS ────────────────────────────────────────────────────────── */}
      {tab === 'data gaps' && (
        <div style={S.tableList}>
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
          {dataGaps.length === 0 && <p style={S.empty}>All hubs have perfect data.</p>}
        </div>
      )}

      {/* ── ACTIVITY ─────────────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div style={S.tableList}>
          {activity.map((a, i) => (
            <div key={i} style={S.bookingRow}>
              <div style={{ minWidth: 0 }}>
                <div style={S.bName}>{a.action}</div>
                <div style={S.bMeta}>{a.name} ({a.email})</div>
              </div>
              <div style={S.bRight}>
                <div style={S.bMeta}>{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {activity.length === 0 && <p style={S.empty}>No activity recorded yet.</p>}
        </div>
      )}

      {/* ── EXPANSION INTELLIGENCE ───────────────────────────────────────────── */}
      {tab === 'expansion' && (
        <div>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(245,124,0,0.06)', border: '1px solid rgba(245,124,0,0.2)', borderRadius: 10 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.14em', color: '#FFCC80', marginBottom: '0.4rem' }}>AREA EXPANSION INTELLIGENCE — LAST 30 DAYS</div>
            <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, lineHeight: 1.6, margin: 0 }}>
              Users searched for these areas and got zero salon results. These represent real demand signals — consider adding salons or activating hubs in the top-ranked areas.
            </p>
          </div>
          {nullSearches.length === 0 && <p style={S.empty}>No unserved searches in the last 30 days — great coverage!</p>}
          {nullSearches.map((ns, i) => (
            <div key={i} style={S.gapRow}>
              <div>
                <div style={S.bName}>
                  <span style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: '#FFCC80', marginRight: '0.5rem' }}>#{i+1}</span>
                  {ns._id}
                  {ns.resolvedName && ns.resolvedName !== ns._id && <span style={S.bMeta}> → resolved as "{ns.resolvedName}"</span>}
                </div>
                <div style={S.bMeta}>Last searched: {new Date(ns.lastSeenAt).toLocaleDateString()}</div>
              </div>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.9rem', color: '#FFCC80', fontWeight: 700 }}>{ns.count}×</span>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORTS ──────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div style={S.tableList}>
          {reports.map((s, i) => (
            <div key={i} style={{ ...S.bookingRow, flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ ...S.bName, fontSize: '1rem' }}>{s.name} <span style={S.bMeta}>({s.hub})</span></div>
                <button
                  style={{ ...S.actBtn, color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.3)' }}
                  onClick={() => toggleSalonDisabled(s)}
                >⊖ Disable Salon</button>
              </div>
              {s.reports.filter(r => r.status === 'pending').map((r, j) => (
                <div key={j} style={{ background: 'rgba(239,68,68,0.05)', borderLeft: '2px solid #ef4444', padding: '0.6rem', marginBottom: '0.4rem', width: '100%', boxSizing: 'border-box', borderRadius: '0 6px 6px 0' }}>
                  <div style={S.bService}>Reason: {r.reason}</div>
                  <div style={S.bMeta}>Details: {r.details}</div>
                  <div style={S.bMeta}>Reported by: {r.user?.name || 'Anonymous'} · {new Date(r.createdAt).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button style={{ ...S.actBtn, fontSize: '0.7rem' }} onClick={() => dismissReport(s._id, r._id, 'resolved')}>✓ Resolved</button>
                    <button style={{ ...S.actBtn, fontSize: '0.7rem', color: COLOR.textGhost }} onClick={() => dismissReport(s._id, r._id, 'dismissed')}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {reports.length === 0 && <p style={S.empty}>No salon reports.</p>}
        </div>
      )}

      {/* ── USERS ────────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div style={S.tableList}>
          {users.map(u => (
            <div key={u._id} style={{ ...S.bookingRow, opacity: u.disabled ? 0.5 : 1 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={S.bName}>{u.name}</span>
                  <span style={{ ...S.roleBadge, ...(u.role === 'admin' ? S.roleBadgeAdmin : u.role === 'owner' ? S.roleBadgeOwner : {}) }}>
                    {u.role.toUpperCase()}
                  </span>
                  {u.disabled && <span style={S.disabledBadge}>SUSPENDED</span>}
                </div>
                <div style={S.bMeta}>{u.email} · Level {u.level || 1} ({u.xp || 0} XP)</div>
                <div style={S.bMeta}>Joined: {new Date(u.createdAt).toLocaleDateString()} · {u.totalBookings || 0} bookings</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', flexShrink: 0 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textGhost }}>ROLE</div>
                <select value={u.role} onChange={e => changeUserRole(u._id, e.target.value)} style={S.sel}>
                  <option value="user">User</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  style={{ ...S.actBtn, color: u.disabled ? '#81C784' : '#EF9A9A', borderColor: u.disabled ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)', fontSize: '0.68rem' }}
                  onClick={() => toggleUserDisabled(u)}
                >
                  {u.disabled ? '⊕ Restore' : '⊖ Suspend'}
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p style={S.empty}>No platform users registered.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, warn, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ ...S.statCard, ...(warn ? S.statCardWarn : {}), ...(onClick ? { cursor: 'pointer' } : {}) }}
    >
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: warn ? '#EF5350' : COLOR.gold }}>{value ?? '—'}</div>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={{ fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.16em', color: COLOR.textGhost, marginBottom: '0.6rem' }}>{label}</div>
      {children}
    </div>
  );
}

function EditRow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: 'rgba(255,248,220,0.4)', marginBottom: '0.2rem' }}>{label}</div>
      {children}
    </div>
  );
}

function RatingRow({ r, onModerate }) {
  return (
    <div style={S.ratingRow}>
      <div style={{ flex: 1, minWidth: 0 }}>
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  // Login
  loginWrap:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030204', padding: '1rem' },
  loginBox:     { width: '100%', maxWidth: 420, padding: 'clamp(1.5rem,5vw,2rem)', background: 'rgba(18,14,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12 },
  logo:         { fontFamily: FONT.mono, fontSize: '1rem', letterSpacing: '0.2em', color: COLOR.gold, marginBottom: '1.2rem', textAlign: 'center' },
  keyInput:     { width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLOR.textPrimary, fontFamily: FONT.body, fontSize: '0.9rem', marginBottom: '0.8rem', boxSizing: 'border-box' },
  loginBtn:     { width: '100%', padding: '0.8rem', background: COLOR.gold, border: 'none', borderRadius: 6, color: '#000', fontFamily: FONT.mono, fontSize: '0.85rem', letterSpacing: '0.16em', cursor: 'pointer' },
  showHideBtn:  { position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer' },
  error:        { color: '#EF5350', fontFamily: FONT.body, fontSize: '0.85rem', marginTop: '0.6rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239,83,80,0.1)', borderRadius: 6 },
  hint:         { color: COLOR.textGhost, fontFamily: FONT.body, fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center', lineHeight: 1.6 },
  // Main layout
  wrap:         { minHeight: '100vh', background: '#030204', padding: 'clamp(0.75rem,3vw,1.5rem)', color: COLOR.textPrimary, fontFamily: FONT.body, overflowX: 'hidden' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' },
  logoutBtn:    { background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: COLOR.textMuted, padding: '0.4rem 0.9rem', fontFamily: FONT.mono, fontSize: '0.8rem', cursor: 'pointer', minHeight: 44 },
  tabs:         { display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab:          { padding: 'clamp(0.4rem,1.5vw,0.55rem) clamp(0.6rem,2vw,1rem)', background: 'transparent', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 6, color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: 'clamp(0.6rem,2vw,0.78rem)', letterSpacing: '0.1em', cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap', minHeight: 44 },
  tabActive:    { borderColor: 'rgba(212,175,55,0.5)', color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  badge:        { marginLeft: 5, background: '#EF5350', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: '0.7rem', verticalAlign: 'middle' },
  toast:        { position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(18,14,24,0.97)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 10, padding: '0.75rem 1.5rem', fontFamily: FONT.mono, fontSize: '0.85rem', color: COLOR.gold, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' },
  // Cards & grids
  grid4:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(120px,25vw,160px),1fr))', gap: '0.75rem' },
  statCard:     { padding: 'clamp(0.7rem,2vw,1rem)', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 8, cursor: 'default' },
  statCardWarn: { borderColor: 'rgba(239,83,80,0.3)' },
  statLabel:    { fontFamily: FONT.mono, fontSize: 'clamp(0.55rem,2vw,0.75rem)', letterSpacing: '0.1em', color: COLOR.textGhost, marginBottom: '0.4rem' },
  statValue:    { fontFamily: FONT.display, fontSize: 'clamp(1.2rem,4vw,1.6rem)' },
  sectionTitle: { fontFamily: FONT.display, fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 300, marginBottom: '0.7rem' },
  empty:        { color: COLOR.textGhost, fontFamily: FONT.mono, fontSize: 'clamp(0.72rem,2vw,0.82rem)', lineHeight: 1.6 },
  // Table rows
  tableList:    { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  bookingRow:   { display: 'flex', justifyContent: 'space-between', padding: 'clamp(0.6rem,2vw,0.9rem)', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' },
  salonRow:     { display: 'flex', justifyContent: 'space-between', padding: 'clamp(0.6rem,2vw,0.9rem)', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' },
  ratingRow:    { display: 'flex', gap: '1rem', padding: 'clamp(0.6rem,2vw,0.9rem)', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', marginBottom: '0.6rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  listingRow:   { display: 'flex', gap: '0.75rem', padding: 'clamp(0.6rem,2vw,0.9rem)', background: 'rgba(212,175,55,0.03)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.1)', marginBottom: '0.6rem', alignItems: 'center', flexWrap: 'wrap' },
  verifyBtn:    { display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.8rem', background: 'rgba(43,163,154,0.1)', border: '1px solid rgba(43,163,154,0.35)', borderRadius: 6, color: '#7FE3D8', fontFamily: FONT.mono, fontSize: 'clamp(0.65rem,2vw,0.75rem)', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 },
  editBtn:      { padding: '0.5rem 0.8rem', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: 'clamp(0.65rem,2vw,0.75rem)', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 },
  bName:        { fontSize: 'clamp(0.85rem,2.5vw,0.95rem)', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' },
  bMeta:        { fontFamily: FONT.mono, fontSize: 'clamp(0.65rem,2vw,0.75rem)', color: COLOR.textGhost, marginTop: '0.2rem' },
  bRight:       { textAlign: 'right' },
  bService:     { fontSize: 'clamp(0.8rem,2.5vw,0.9rem)', color: COLOR.gold },
  statusPip:    { fontFamily: FONT.mono, fontSize: 'clamp(0.65rem,2vw,0.75rem)', letterSpacing: '0.1em' },
  comment:      { fontSize: 'clamp(0.78rem,2.5vw,0.85rem)', color: COLOR.textMuted, marginTop: '0.4rem' },
  actions:      { display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 },
  actBtn:       { background: 'none', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 5, padding: '0.45rem 0.7rem', color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: 'clamp(0.65rem,2vw,0.75rem)', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 },
  gapRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(0.5rem,2vw,0.75rem)', background: 'rgba(212,175,55,0.03)', borderRadius: 8, flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' },
  gapStats:     { display: 'flex', gap: '0.75rem', fontFamily: FONT.mono, fontSize: 'clamp(0.6rem,2vw,0.65rem)', color: COLOR.textMuted, flexWrap: 'wrap' },
  // Search bar
  searchBar:    { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  filterBtn:    { padding: '0.5rem 1rem', background: COLOR.gold, border: 'none', borderRadius: 6, fontFamily: FONT.mono, fontSize: '0.75rem', color: '#000', cursor: 'pointer', minHeight: 44 },
  // Badges
  disabledBadge: { background: 'rgba(239,83,80,0.15)', color: '#EF9A9A', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 3, padding: '0.1rem 0.4rem', fontFamily: FONT.mono, fontSize: '0.6rem' },
  ownedBadge:   { background: 'rgba(212,175,55,0.15)', color: COLOR.gold, border: '1px solid rgba(212,175,55,0.3)', borderRadius: 3, padding: '0.1rem 0.4rem', fontFamily: FONT.mono, fontSize: '0.6rem' },
  roleBadge:    { background: 'rgba(255,255,255,0.06)', color: COLOR.textMuted, padding: '0.1rem 0.4rem', borderRadius: 3, fontFamily: FONT.mono, fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' },
  roleBadgeAdmin: { background: 'rgba(239,83,80,0.15)', color: '#EF5350' },
  roleBadgeOwner: { background: 'rgba(212,175,55,0.15)', color: COLOR.gold },
  // Category chips
  catChip:      { padding: '0.25rem 0.55rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.textMuted, cursor: 'pointer', minHeight: 36 },
  catChipActive: { background: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.4)', color: COLOR.gold },
  // Edit Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(3,2,4,0.92)', backdropFilter: 'blur(8px)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal:        { background: 'rgba(13,10,19,0.98)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalBody:    { flex: 1, overflowY: 'auto', padding: '1.2rem 1.5rem' },
  modalFooter:  { display: 'flex', gap: '0.6rem', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', justifyContent: 'flex-end' },
  closeBtn:     { background: 'none', border: 'none', color: COLOR.textMuted, fontSize: '1.1rem', cursor: 'pointer', padding: '0.2rem 0.4rem', minHeight: 44, minWidth: 44 },
  inp:          { width: '100%', padding: '0.65rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, outline: 'none', fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary, boxSizing: 'border-box' },
  sel:          { padding: '0.55rem 0.7rem', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: COLOR.textPrimary, fontFamily: FONT.body, fontSize: '0.82rem', cursor: 'pointer', outline: 'none', minHeight: 44 },
  saveBtn:      { padding: '0.65rem 1.4rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.78rem', fontWeight: 700, color: '#000', cursor: 'pointer', letterSpacing: '0.1em', minHeight: 44 },
  cancelBtn:    { padding: '0.65rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.78rem', color: COLOR.textMuted, cursor: 'pointer', minHeight: 44 },
};
