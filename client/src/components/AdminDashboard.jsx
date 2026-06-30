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

const ALL_TABS = ['overview','analytics','salons','claims','moderation','listings','bookings','data gaps','activity','expansion','reports','scanner','users'];

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

  // AI Quality Scanner and report replying state
  const [typeFilter, setTypeFilter] = useState('all');
  const [scannerResults, setScannerResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [reportReplyMsg, setReportReplyMsg] = useState('');
  const [replyingToReport, setReplyingToReport] = useState(null);
  const [replySaving, setReplySaving] = useState(false);

  // Listings tab state
  const [listingView,   setListingView]   = useState('unverified'); // 'unverified' | 'all'
  const [salonSearch,   setSalonSearch]   = useState('');
  const [hubFilter,     setHubFilter]     = useState('');
  const [disabledFilter, setDisabledFilter] = useState('');
  const [editSalon,     setEditSalon]     = useState(null); // salon being edited in modal
  const [editForm,      setEditForm]      = useState({});
  const [editSaving,    setEditSaving]    = useState(false);

  // Claims tab state
  const [claimSearch,   setClaimSearch]   = useState('');
  const [claimStatus,   setClaimStatus]   = useState('pending');
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [bulkRejecting, setBulkRejecting] = useState(false);

  // Users tab state
  const [userSearch,    setUserSearch]    = useState('');
  const [userRoleFilter,setUserRoleFilter]= useState('');

  // Bookings tab state
  const [bookingSearch,  setBookingSearch]  = useState('');
  const [bookingStatus,  setBookingStatus]  = useState('');

  // Activity tab state
  const [activityFilter, setActivityFilter] = useState('');

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
      setOrphanedCount(clm.orphanedCount || 0);
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

  useEffect(() => {
    if (tab === 'scanner' && token) {
      runScanner();
    }
  }, [tab, token]);

  useEffect(() => {
    if (token) fetchAllSalons();
  }, [typeFilter, disabledFilter, hubFilter, token]);

  // ─── Fetch all salons with current filters (for the Salons tab) ────────────
  const fetchAllSalons = async () => {
    try {
      const params = new URLSearchParams({ search: salonSearch, hub: hubFilter, limit: 50, type: typeFilter });
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

  const respondToClaim = async (claimId, action, message) => {
    const res = await fetch(`${API}/api/admin/claims/${claimId}/respond`, {
      method: 'POST', headers: authH(token), body: JSON.stringify({ action, message }),
    });
    const data = await res.json();
    if (data.success) { fetchAll(token); showToast(`Claim ${action}d.`); }
    else showToast(data.error || 'Failed to respond to claim');
  };

  const bulkRejectOrphaned = async () => {
    if (!window.confirm(`Bulk-reject all ${orphanedCount} orphaned claims with no valid data? This cannot be undone.`)) return;
    setBulkRejecting(true);
    try {
      const r = await fetch(`${API}/api/admin/claims/bulk-reject-orphaned`, {
        method: 'POST', headers: authH(token),
      });
      const d = await r.json();
      showToast(d.message || 'Done');
      fetchAll(token);
    } catch { showToast('Bulk reject failed.'); }
    finally { setBulkRejecting(false); }
  };

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams({ status: claimStatus, search: claimSearch });
      const r = await fetch(`${API}/api/admin/claims?${params}`, { headers: authH(token) });
      const d = await r.json();
      if (d.success) { setClaims(d.claims || []); setOrphanedCount(d.orphanedCount || 0); }
    } catch { /* non-critical */ }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({ search: userSearch, role: userRoleFilter });
      const r = await fetch(`${API}/api/admin/users?${params}`, { headers: authH(token) });
      const d = await r.json();
      if (d.success) setUsers(d.users || []);
    } catch { /* non-critical */ }
  };

  const dismissReport = async (salonId, reportId, action) => {
    const r = await fetch(`${API}/api/admin/salons/${salonId}/reports/${reportId}`, {
      method: 'PATCH', headers: authH(token), body: JSON.stringify({ action }),
    });
    const d = await r.json();
    showToast(d.message || 'Done');
    fetchAll(token);
  };

  const runScanner = async () => {
    setScanning(true);
    try {
      const r = await fetch(`${API}/api/admin/scanner/scan`, { headers: authH(token) });
      const d = await r.json();
      if (d.success) {
        setScannerResults(d.salons || []);
        showToast(`✓ AI scan completed: flagged ${d.count} issues.`);
      } else {
        showToast(`✗ Scan failed: ${d.error}`);
      }
    } catch (e) { showToast(`✗ Scan failed: ${e.message}`); }
    finally { setScanning(false); }
  };

  const revokeClaims = async (ids) => {
    if (!ids || ids.length === 0) return;
    if (!window.confirm(`Revoke listing verification for ${ids.length} selected shops? They will return to unclaimed status.`)) return;
    setRevoking(true);
    try {
      const r = await fetch(`${API}/api/admin/scanner/revoke`, {
        method: 'POST',
        headers: authH(token),
        body: JSON.stringify({ ids }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(`✓ ${d.message}`);
        runScanner();
        fetchAll(token);
        fetchAllSalons();
      } else {
        showToast(`✗ Action failed: ${d.error}`);
      }
    } catch (e) { showToast(`✗ Action failed: ${e.message}`); }
    finally { setRevoking(false); }
  };

  const submitReportReply = async () => {
    if (!replyingToReport || !reportReplyMsg.trim()) return;
    setReplySaving(true);
    try {
      const r = await fetch(`${API}/api/admin/salons/${replyingToReport.salonId}/reports/${replyingToReport.reportId}/reply`, {
        method: 'POST',
        headers: authH(token),
        body: JSON.stringify({ message: reportReplyMsg }),
      });
      const d = await r.json();
      if (d.success) {
        showToast('✓ Reply submitted successfully.');
        setReplyingToReport(null);
        setReportReplyMsg('');
        fetchAll(token);
      } else {
        showToast(`✗ Reply failed: ${d.error}`);
      }
    } catch (e) { showToast(`✗ Reply failed: ${e.message}`); }
    finally { setReplySaving(false); }
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

              {/* Images — URL inputs + File upload */}
              <FieldGroup label="IMAGES">
                <EditRow label="Banner URL or Upload">
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input style={{ ...S.inp, flex: 1 }} value={editForm.banner} onChange={e => setEditForm(f => ({ ...f, banner: e.target.value }))} placeholder="https://… or upload file →" />
                    <label style={S.uploadImgBtn} title="Upload file">
                      📁
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setEditForm(f => ({ ...f, banner: ev.target.result, thumbnail: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                  {editForm.banner && <img src={editForm.banner} alt="Banner preview" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginTop: '0.4rem' }} onError={e => { e.target.style.display='none'; }} />}
                </EditRow>
                <EditRow label="Thumbnail URL or Upload">
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input style={{ ...S.inp, flex: 1 }} value={editForm.thumbnail} onChange={e => setEditForm(f => ({ ...f, thumbnail: e.target.value }))} placeholder="https://…" />
                    <label style={S.uploadImgBtn} title="Upload file">
                      📁
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setEditForm(f => ({ ...f, thumbnail: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                </EditRow>
                <EditRow label="Gallery — URLs (one per line) or Upload Files">
                  <label style={{ ...S.uploadImgBtn, width: '100%', justifyContent: 'center', marginBottom: '0.5rem', cursor: 'pointer', display: 'flex', gap: '0.4rem', boxSizing: 'border-box' }}>
                    📁 Upload Gallery Photos
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                      Array.from(e.target.files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = ev => setEditForm(f => ({ ...f, gallery: f.gallery ? f.gallery + '\n' + ev.target.result : ev.target.result }));
                        reader.readAsDataURL(file);
                      });
                    }} />
                  </label>
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
          {/* Orphaned claims warning */}
          {orphanedCount > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: '#EF9A9A' }}>
                ⚠ {orphanedCount} orphaned claim{orphanedCount > 1 ? 's' : ''} detected — these have no valid salon data (probably from deleted salons or test submissions).
              </div>
              <button
                style={{ ...S.actBtn, color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.3)', background: 'rgba(239,83,80,0.08)', minHeight: 36 }}
                onClick={bulkRejectOrphaned}
                disabled={bulkRejecting}
              >
                {bulkRejecting ? '⟳ Rejecting…' : '✕ Bulk-Reject All Orphaned'}
              </button>
            </div>
          )}

          {/* Search & filter */}
          <div style={S.searchBar}>
            <input style={{ ...S.inp, flex: 1 }} placeholder="Search by salon, hub, user, email…"
              value={claimSearch} onChange={e => setClaimSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchClaims()} />
            <select style={S.sel} value={claimStatus} onChange={e => setClaimStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
            <button style={S.filterBtn} onClick={fetchClaims}>Search</button>
          </div>

          <h3 style={S.sectionTitle}>
            {claimStatus.charAt(0).toUpperCase() + claimStatus.slice(1)} Claims ({claims.length})
          </h3>
          {claims.length === 0 && <p style={S.empty}>No claims match the current filter. ✓</p>}
          {claims.map(c => {
            const claimDate = c.claimPendingAt ? new Date(c.claimPendingAt) : null;
            const dateStr = claimDate && !isNaN(claimDate) ? claimDate.toLocaleDateString() : 'Date unknown';
            return (
              <div key={c._id} style={{ ...S.ratingRow, flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={S.bName}>
                      {c.claimPending?.name || 'Unknown User'}
                      <span style={S.bMeta}>({c.claimPending?.email || 'no email'})</span>
                    </div>
                    <div style={S.bMeta}>Requesting to claim:</div>
                    <div style={{ ...S.bName, color: COLOR.gold, marginTop: '0.2rem' }}>{c.name}</div>
                    <div style={S.bMeta}>Hub: {c.hub} · Submitted as: "{c.claimPendingName || c.name}"</div>
                    {c.claimPending?.totalBookings > 0 && (
                      <div style={{ ...S.bMeta, color: '#A5D6A7' }}>✓ {c.claimPending.totalBookings} bookings on platform (trust signal)</div>
                    )}
                    {c.claimAdminMessage && (
                      <div style={{ ...S.bMeta, color: '#90CAF9', marginTop: '0.3rem' }}>Admin note: {c.claimAdminMessage}</div>
                    )}
                  </div>
                  <div style={S.bRight}>
                    <div style={S.bMeta}>{dateStr}</div>
                    <span style={{ ...S.statusPip, color: c.claimStatus === 'approved' ? '#81C784' : c.claimStatus === 'rejected' ? '#EF9A9A' : '#90CAF9' }}>
                      {c.claimStatus?.toUpperCase()}
                    </span>
                  </div>
                </div>
                {c.claimStatus === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                      style={{ ...S.actBtn, background: 'rgba(76,175,80,0.1)', color: '#81C784', borderColor: 'rgba(76,175,80,0.3)' }}
                      onClick={() => {
                        const msg = prompt('Optional welcome message for the shop owner:');
                        if (msg !== null) respondToClaim(c._id, 'approve', msg);
                      }}
                    >✓ Approve Claim</button>
                    <button
                      style={{ ...S.actBtn, background: 'rgba(239,83,80,0.1)', color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.3)' }}
                      onClick={() => {
                        const msg = prompt('Reason for rejection (shown to user):');
                        if (msg !== null) respondToClaim(c._id, 'reject', msg || 'Could not verify ownership.');
                      }}
                    >✕ Reject Claim</button>
                  </div>
                )}
              </div>
            );
          })}
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
      {tab === 'bookings' && (() => {
        const bFiltered = bookings.filter(b => {
          const q = bookingSearch.toLowerCase();
          const matchSearch = !q || b.salonName?.toLowerCase().includes(q) || b.customerName?.toLowerCase().includes(q) || b.customerEmail?.toLowerCase().includes(q);
          const matchStatus = !bookingStatus || b.status === bookingStatus;
          return matchSearch && matchStatus;
        });
        return (
          <div>
            <div style={S.searchBar}>
              <input style={{ ...S.inp, flex: 1 }} placeholder="Search by salon or customer…"
                value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} />
              <select style={S.sel} value={bookingStatus} onChange={e => setBookingStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={S.tableList}>
              {bFiltered.map(b => (
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
              {bFiltered.length === 0 && <p style={S.empty}>No bookings match the current filter.</p>}
            </div>
          </div>
        );
      })()}

      {/* ── DATA GAPS ────────────────────────────────────────────────────────── */}
      {tab === 'data gaps' && (
        <div>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, marginBottom: '1.2rem' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.14em', color: COLOR.gold, marginBottom: '0.4rem' }}>HOW TO READ THIS</div>
            <p style={{ fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textMuted, margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: COLOR.textPrimary }}>% Categorized</strong> — What % of salons in this area have a service type tag (Hair, Spa, Beauty etc.).
              A low number means users can't filter by service in that area.<br/>
              <strong style={{ color: COLOR.textPrimary }}>% Phone</strong> — What % of salons have a contact phone number listed.
              Low phone coverage means users can't call or WhatsApp salons directly.
            </p>
          </div>
          <div style={S.tableList}>
            {dataGaps.map(h => {
              const catPct = h.count > 0 ? Math.round((h.withCategories / h.count) * 100) : 0;
              const phonePct = h.count > 0 ? Math.round((h.withPhone / h.count) * 100) : 0;
              const catColor = catPct < 30 ? '#EF5350' : catPct < 70 ? '#FFCC80' : '#81C784';
              const phoneColor = phonePct < 30 ? '#EF5350' : phonePct < 70 ? '#FFCC80' : '#81C784';
              return (
                <div key={h._id} style={{ ...S.gapRow, flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div style={S.bName}>{h._id}</div>
                    <span style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: COLOR.textGhost }}>{h.count} salons</span>
                  </div>
                  {/* Service categories progress bar */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost }}>SERVICE TAGS</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: catColor }}>{catPct}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${catPct}%`, height: '100%', background: catColor, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                  {/* Phone coverage progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost }}>PHONE COVERAGE</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: phoneColor }}>{phonePct}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${phonePct}%`, height: '100%', background: phoneColor, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {dataGaps.length === 0 && <p style={S.empty}>All hubs have complete data.</p>}
          </div>
        </div>
      )}

      {/* ── ACTIVITY ─────────────────────────────────────────────────────────── */}
      {tab === 'activity' && (() => {
        const aFiltered = activity.filter(a =>
          !activityFilter || (a.action || '').toLowerCase().includes(activityFilter.toLowerCase())
        );
        return (
          <div>
            <div style={S.searchBar}>
              <input style={{ ...S.inp, flex: 1 }} placeholder="Filter by action type…"
                value={activityFilter} onChange={e => setActivityFilter(e.target.value)} />
            </div>
            <div style={S.tableList}>
              {aFiltered.map((a, i) => (
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
              {aFiltered.length === 0 && <p style={S.empty}>No activity matches the current filter.</p>}
            </div>
          </div>
        );
      })()}

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
              {s.reports.map((r, j) => (
                <div key={j} style={{ background: r.status === 'pending' ? 'rgba(239,68,68,0.05)' : 'rgba(76,175,80,0.05)', borderLeft: r.status === 'pending' ? '2px solid #ef4444' : '2px solid #4caf50', padding: '0.6rem', marginBottom: '0.4rem', width: '100%', boxSizing: 'border-box', borderRadius: '0 6px 6px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={S.bService}>Reason: {r.reason}</div>
                    <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', color: r.status === 'pending' ? '#ef4444' : '#4caf50' }}>{r.status.toUpperCase()}</span>
                  </div>
                  <div style={S.bMeta}>Details: {r.details}</div>
                  <div style={S.bMeta}>Reported by: {r.user?.name || 'Anonymous'} · {new Date(r.createdAt).toLocaleString()}</div>
                  
                  {r.replyMessage && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px dashed rgba(212,175,55,0.2)' }}>
                      <div style={{ fontFamily: FONT.mono, fontSize: '0.58rem', color: COLOR.gold, marginBottom: '0.2rem' }}>✦ ADMIN RESPONSE / AI REPLY</div>
                      <div style={{ fontFamily: FONT.body, fontSize: '0.75rem', color: COLOR.textPrimary }}>{r.replyMessage}</div>
                      {r.repliedAt && <div style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textGhost, marginTop: '0.2rem' }}>Replied at: {new Date(r.repliedAt).toLocaleString()}</div>}
                    </div>
                  )}

                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button style={{ ...S.actBtn, fontSize: '0.7rem' }} onClick={() => dismissReport(s._id, r._id, 'resolved')}>✓ Resolved</button>
                      <button style={{ ...S.actBtn, fontSize: '0.7rem', color: COLOR.gold }} onClick={() => setReplyingToReport({ salonId: s._id, reportId: r._id, salonName: s.name, reason: r.reason })}>💬 Reply to User</button>
                      <button style={{ ...S.actBtn, fontSize: '0.7rem', color: COLOR.textGhost }} onClick={() => dismissReport(s._id, r._id, 'dismissed')}>Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {reports.length === 0 && <p style={S.empty}>No salon reports.</p>}
        </div>
      )}

      {/* ── USERS ────────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <div style={S.searchBar}>
            <input style={{ ...S.inp, flex: 1 }} placeholder="Search by name or email…"
              value={userSearch} onChange={e => setUserSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
            <select style={S.sel} value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
            <button style={S.filterBtn} onClick={fetchUsers}>Search</button>
          </div>
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
                  {u.shopClaimStatus && u.shopClaimStatus !== 'none' && (
                    <div style={{ ...S.bMeta, color: u.shopClaimStatus === 'approved' ? '#81C784' : u.shopClaimStatus === 'rejected' ? '#EF9A9A' : '#90CAF9' }}>
                      Shop claim: {u.shopClaimStatus}
                    </div>
                  )}
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
            {users.length === 0 && <p style={S.empty}>No users match the current filter.</p>}
          </div>
        </div>
      )}

      {/* ── AI QUALITY SCANNER ─────────────────────────────────────────────────── */}
      {tab === 'scanner' && (
        <div>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: '0.65rem', letterSpacing: '0.14em', color: COLOR.gold, marginBottom: '0.4rem' }}>AURA PLATFORM QUALITY AUDIT & AI SCANNER</div>
              <p style={{ fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, lineHeight: 1.6, margin: 0 }}>
                This intelligent scanner crawls all registered salon listings to audit contact details, placeholder coordinates, spam content, and verify owner authenticity. Use it to revoke fake claims instantly and return shops to the marketplace claim queue.
              </p>
            </div>
            <button 
              style={{ ...S.filterBtn, background: COLOR.gold, color: '#000', fontWeight: 'bold' }} 
              onClick={runScanner} 
              disabled={scanning}
            >
              {scanning ? 'Analyzing Listings…' : '✦ Run Quality Audit Scan'}
            </button>
          </div>

          {scanning && (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: FONT.mono, color: COLOR.gold, fontSize: '0.85rem' }}>
              ⟳ Scanning database pipeline... Analysing profiles for placeholder keywords, duplicate coordinates, and missing metadata.
            </div>
          )}

          {!scanning && scannerResults.length === 0 && (
            <p style={S.empty}>✓ No quality flags or placeholder claims found. The platform database is fully optimized!</p>
          )}

          {!scanning && scannerResults.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h3 style={S.sectionTitle}>Flagged Issues ({scannerResults.length})</h3>
                <button
                  style={{ ...S.actBtn, color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.4)', background: 'rgba(239,83,80,0.1)' }}
                  onClick={() => revokeClaims(scannerResults.filter(s => s.listingVerified).map(s => s._id))}
                  disabled={revoking || scannerResults.filter(s => s.listingVerified).length === 0}
                >
                  ✕ Revoke All Verified Claims with Issues
                </button>
              </div>

              <div style={S.tableList}>
                {scannerResults.map(s => (
                  <div key={s._id} style={{ ...S.bookingRow, flexDirection: 'column', alignItems: 'stretch', borderColor: 'rgba(239,83,80,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ ...S.bName, color: COLOR.gold }}>{s.name} <span style={S.bMeta}>({s.hub})</span></div>
                        <div style={S.bMeta}>ID: {s._id} · Phone: {s.contact?.phone || 'Missing'} · Web: {s.contact?.website || 'Missing'}</div>
                        {s.owner && (
                          <div style={{ ...S.bMeta, color: COLOR.gold }}>👤 Claimed by: {s.owner.name} ({s.owner.email})</div>
                        )}
                      </div>
                      
                      {s.listingVerified && (
                        <button
                          style={{ ...S.actBtn, color: '#EF9A9A', borderColor: 'rgba(239,83,80,0.3)', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          onClick={() => revokeClaims([s._id])}
                          disabled={revoking}
                        >
                          Revoke Claim
                        </button>
                      )}
                    </div>

                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {s.reasons.map((r, idx) => (
                        <div key={idx} style={{ fontFamily: FONT.mono, fontSize: '0.72rem', color: '#FF8A80', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ⚠️ {r}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Reply Modal */}
      {replyingToReport && (
        <div style={S.modalOverlay} onClick={() => setReplyingToReport(null)}>
          <div style={{ ...S.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.15em', color: COLOR.gold }}>REPLY TO USER REPORT</span>
              <button style={S.closeBtn} onClick={() => setReplyingToReport(null)}>✕</button>
            </div>
            <div style={{ ...S.modalBody, padding: '1.5rem' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: '0.7rem', color: COLOR.textGhost, marginBottom: '0.5rem' }}>SHOP: {replyingToReport.salonName}</div>
              <div style={{ fontFamily: FONT.body, fontSize: '0.8rem', color: '#EF9A9A', marginBottom: '1.2rem', padding: '0.5rem', background: 'rgba(239,83,80,0.06)', borderRadius: 6, borderLeft: '2px solid #ef4444' }}>
                Reason: {replyingToReport.reason}
              </div>
              
              <FieldGroup label="REPLY MESSAGE">
                <textarea 
                  style={{ ...S.inp, height: 120, resize: 'vertical' }} 
                  placeholder="Explain how this issue is handled or request further details..."
                  value={reportReplyMsg}
                  onChange={e => setReportReplyMsg(e.target.value)}
                />
              </FieldGroup>
            </div>
            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={() => setReplyingToReport(null)}>Cancel</button>
              <button 
                style={{ ...S.saveBtn, opacity: replySaving ? 0.6 : 1 }} 
                onClick={submitReportReply} 
                disabled={replySaving || !reportReplyMsg.trim()}
              >
                {replySaving ? 'Sending…' : '✓ Send & Resolve Report'}
              </button>
            </div>
          </div>
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
  // Upload image button in edit modal
  uploadImgBtn: {
    padding: '0.55rem 0.7rem', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 6, color: COLOR.gold, cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', minHeight: 36,
  },
  cancelBtn:    { padding: '0.65rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontFamily: FONT.mono, fontSize: '0.78rem', color: COLOR.textMuted, cursor: 'pointer', minHeight: 44 },
};
