import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

export default function MyAccount({ onClose }) {
  const { user, setUser } = useAura();
  const { t } = useLanguage();
  
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('bookings');
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  // Localized state for dynamic UI copy strings
  const [ui, setUi] = useState({
    bookingsTab: '', ratingsTab: '', settingsTab: '', bookingLog: '', emptyBookings: '',
    emptyRatings: '', deleteBtnText: '', loadingProfile: '', xpString: ''
  });

  const [translatedBookings, setTranslatedBookings] = useState([]);
  const [translatedRatings, setTranslatedRatings] = useState([]);

  const token = localStorage.getItem('aura_token');

  const reloadProfile = () => {
    if (!token) { setError('Not logged in'); return; }
    fetch(`${API}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError(d.error || 'Could not load your account'); })
      .catch(() => setError('Could not load your account'));
  };

  useEffect(reloadProfile, [token]);

  // 1. Resolve general UI string translations dynamically
  useEffect(() => {
    const translateStaticLabels = async () => {
      const progress = data ? xpProgress(data.user.xp || 0) : null;
      let computedXpLabel = '';
      if (progress) {
        computedXpLabel = progress.labelKey 
          ? await t(progress.labelKey)
          : `${progress.remainingXp} ${await t('XP to level')} ${progress.nextLevel}`;
      }

      setUi({
        bookingsTab: `${await t('BOOKINGS')} (${data?.bookings?.length || 0})`,
        ratingsTab: `${await t('RATINGS')} (${data?.ratings?.length || 0})`,
        settingsTab: await t('SETTINGS'),
        bookingLog: await t('Booking Log'),
        emptyBookings: await t('No bookings yet — your booking history will appear here.'),
        emptyRatings: await t("You haven't rated any salons yet."),
        deleteBtnText: deleting ? await t('Deleting…') : await t('Delete my account'),
        loadingProfile: await t('Loading dynamic activity profile...'),
        xpString: computedXpLabel
      });
    };
    translateStaticLabels();
  }, [data, deleting, t]);

  // 2. Dynamic, on-the-fly translation of server data entries (Hub names, Salon names, Services)
  useEffect(() => {
    const parseData = async () => {
      if (!data) return;

      if (data.bookings) {
        const bTx = await Promise.all(data.bookings.map(async b => ({
          ...b,
          txName: await t(b.salonName),
          txHub: await t(b.salonHub),
          txService: await t(b.service),
          txStatus: await t(b.status)
        })));
        setTranslatedBookings(bTx);
      }

      if (data.ratings) {
        const rTx = await Promise.all(data.ratings.map(async r => ({
          ...r,
          txSalonName: await t(r.salonId?.name || 'Salon'),
          txHub: await t(r.salonId?.hub || ''),
          txComment: r.comment ? await t(r.comment) : ''
        })));
        setTranslatedRatings(rTx);
      }
    };
    parseData();
  }, [data, t]);

  const deleteAccount = async () => {
    const confirmationMsg = await t('This permanently deletes your account and anonymizes your booking history. Continue?');
    if (!window.confirm(confirmationMsg)) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/users`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      window.location.reload();
    } catch {
      setDeleting(false);
    }
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr(await t('Please choose an image file.')); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr(await t('Image must be under 5MB.')); return; }
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
      } catch (e) {
        setUploadErr(e.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;
  const progress = data ? xpProgress(data.user.xp || 0) : null;

  return (
    <motion.div style={S.ov} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={S.back} onClick={onClose} />
      <motion.div style={S.box} initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}>
        <button style={S.close} onClick={onClose}>✕</button>

        {error && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: '#EF5350' }}>{error}</p>
          </div>
        )}

        {!data && !error && (
          <p style={S.meta}>{ui.loadingProfile}</p>
        )}

        {data && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
              <div style={S.avatarWrap} onClick={() => fileRef.current?.click()} title="Change profile photo">
                {data.user.avatarUrl
                  ? <img src={data.user.avatarUrl} alt={data.user.name} style={S.avatarImg} />
                  : <span style={S.avatarInitial}>{data.user.name?.charAt(0).toUpperCase()}</span>}
                <span style={S.avatarEdit}>{uploading ? '…' : '✎'}</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarFile} />
              {uploadErr && <p style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: '#EF5350', marginTop: '0.3rem' }}>{uploadErr}</p>}

              <div style={{ fontFamily: FONT.display, fontSize: '1.5rem', fontWeight: 300, color: COLOR.textPrimary, marginTop: '0.5rem' }}>{data.user.name}</div>
              <p style={{ fontFamily: FONT.mono, fontSize: '0.65rem', letterSpacing: '0.13em', color: COLOR.textMuted, marginTop: '0.2rem' }}>{data.user.email}</p>

              {progress && (
                <div style={S.xpRow}>
                  <span style={S.xpLevel}>{data.user.levelLabel || 'LEVEL'} {progress.level}</span>
                  <div style={S.xpBarTrack}><div style={{ ...S.xpBarFill, width: `${progress.pct}%` }} /></div>
                  <span style={S.xpLabel}>{ui.xpString}</span>
                </div>
              )}

              {data.user.role === 'owner' && (
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                  <button style={S.ownerBtn} onClick={() => alert('Owner Dashboard coming soon!')}>✦ Manage your shop</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setTab('bookings')} style={{ ...S.tab, ...(tab === 'bookings' ? S.tabActive : {}) }}>{ui.bookingsTab}</button>
              <button onClick={() => setTab('ratings')} style={{ ...S.tab, ...(tab === 'ratings' ? S.tabActive : {}) }}>{ui.ratingsTab}</button>
              <button onClick={() => setTab('settings')} style={{ ...S.tab, ...(tab === 'settings' ? S.tabActive : {}) }}>{ui.settingsTab}</button>
            </div>

            {tab === 'bookings' && (
              <div style={S.list}>
                {translatedBookings.length === 0 && <p style={S.empty}>{ui.emptyBookings}</p>}
                {translatedBookings.map(b => (
                  <div key={b._id} style={S.item}>
                    <div style={S.itemTitle}>{b.txName}</div>
                    <div style={S.itemMeta}>{b.txHub} · {b.txService} · {b.date} · {b.timeSlot}</div>
                    <span style={{ ...S.statusPip, color: b.status === 'cancelled' ? '#EF5350' : '#4CAF50' }}>{b.txStatus?.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'ratings' && (
              <div style={S.list}>
                {translatedRatings.length === 0 && <p style={S.empty}>{ui.emptyRatings}</p>}
                {translatedRatings.map(r => (
                  <div key={r._id} style={S.item}>
                    <div style={S.itemTitle}>
                      {r.txSalonName} · {r.txHub}
                      {r.isVerified && <VerifiedBadge size={12} />}
                    </div>
                    <div style={S.itemMeta}>{'★'.repeat(r.stars)} · {new Date(r.createdAt).toLocaleDateString()}</div>
                    {r.txComment && <p style={S.comment}>{r.txComment}</p>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'settings' && (
              <SettingsPanel token={token} onAvatarRemoved={reloadProfile} hasAvatar={!!data.user.avatarUrl} t={t} />
            )}

            <button style={S.deleteBtn} onClick={deleteAccount} disabled={deleting}>
              {ui.deleteBtnText}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function SettingsPanel({ token, onAvatarRemoved, hasAvatar, t }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgErr, setMsgErr] = useState(false);

  const [panelUi, setPanelUi] = useState({
    title: '', currentPl: '', nextPl: '', updateBtn: '', removePhotoBtn: ''
  });

  useEffect(() => {
    const loadPanelLabels = async () => {
      setPanelUi({
        title: await t('Change password'),
        currentPl: await t('Current password'),
        nextPl: await t('New password (8+ characters)'),
        updateBtn: busy ? await t('Updating…') : await t('Update password'),
        removePhotoBtn: await t('Remove profile photo')
      });
    };
    loadPanelLabels();
  }, [busy, t]);

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
      setMsg(await t('Password updated.')); setCurrent(''); setNext('');
    } catch (e) {
      setMsg(await t(e.message)); setMsgErr(true);
    } fileRef.current = null;
    setBusy(false);
  };

  const removeAvatar = async () => {
    await fetch(`${API}/api/auth/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    onAvatarRemoved();
  };

  return (
    <div style={S.list}>
      <div style={S.item}>
        <div style={S.itemTitle}>{panelUi.title}</div>
        <input style={S.inp} type="password" placeholder={panelUi.currentPl} value={current} onChange={e => setCurrent(e.target.value)} />
        <input style={{ ...S.inp, marginTop: '0.5rem' }} type="password" placeholder={panelUi.nextPl} value={next} onChange={e => setNext(e.target.value)} />
        <button style={S.smallBtn} onClick={changePassword} disabled={busy || !current || next.length < 8}>{panelUi.updateBtn}</button>
        {msg && <p style={{ fontFamily: FONT.mono, fontSize: '0.55rem', color: msgErr ? '#EF5350' : '#4CAF50', marginTop: '0.4rem' }}>{msg}</p>}
      </div>
      {hasAvatar && (
        <div style={S.item}>
          <button style={S.smallBtnGhost} onClick={removeAvatar}>{panelUi.removePhotoBtn}</button>
        </div>
      )}
    </div>
  );
}

const S = {
  ov:  { position: 'fixed', inset: 0, zIndex: 920, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  back:{ position: 'absolute', inset: 0, background: 'rgba(3,2,4,0.88)', backdropFilter: 'blur(12px)' },
  box: { position: 'relative', width: '100%', maxWidth: 460, background: 'rgba(13,10,19,0.97)', border: '1px solid rgba(212,175,55,0.22)', borderRadius: 16, padding: 'clamp(1.2rem,5vw,1.8rem)', boxShadow: '0 30px 80px rgba(0,0,0,0.85)', maxHeight: '85vh', overflowY: 'auto' },
  close:{ position: 'absolute', top: '0.9rem', right: '0.9rem', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,248,220,0.3)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.75rem' },
  avatarWrap: { position: 'relative', width: 76, height: 76, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { fontFamily: FONT.display, fontSize: '1.8rem', color: COLOR.gold },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff' },
  xpRow: { marginTop: '0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  xpLevel: { fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.16em', color: COLOR.gold },
  xpBarTrack: { width: 140, height: 4, background: 'rgba(212,175,55,0.1)', borderRadius: 2, overflow: 'hidden' },
  xpBarFill: { height: '100%', background: 'linear-gradient(90deg,#D4AF37,#FFF2A8)', transition: 'width 0.4s ease' },
  xpLabel: { fontFamily: FONT.mono, fontSize: '0.5rem', color: COLOR.textGhost },
  tab: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 20, color: COLOR.textMuted, fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.08em', cursor: 'pointer' },
  tabActive: { borderColor: 'rgba(212,175,55,0.5)', color: COLOR.gold, background: 'rgba(212,175,55,0.06)' },
  ownerBtn: { padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #D4AF37, #AA8A2A)', color: '#000', border: 'none', borderRadius: 6, fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.12em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' },
  item: { padding: '0.75rem 0.85rem', background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 8 },
  itemTitle: { fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' },
  itemMeta: { fontFamily: FONT.mono, fontSize: '0.6rem', letterSpacing: '0.08em', color: COLOR.textGhost, marginTop: '0.25rem' },
  statusPip: { fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', display: 'block', marginTop: '0.3rem' },
  comment: { fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textMuted, marginTop: '0.4rem' },
  empty: { fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost, textAlign: 'center', padding: '1.5rem 0' },
  inp: { width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, outline: 'none', fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textPrimary, boxSizing: 'border-box' },
  smallBtn: { width: '100%', padding: '0.5rem', marginTop: '0.6rem', background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', border: 'none', borderRadius: 6, fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', fontWeight: 700, color: '#000', cursor: 'pointer' },
  smallBtnGhost: { width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 6, fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', color: '#EF5350', cursor: 'pointer' },
  deleteBtn: { width: '100%', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 7, color: '#EF5350', fontFamily: FONT.mono, fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', marginTop: '0.5rem' },
};