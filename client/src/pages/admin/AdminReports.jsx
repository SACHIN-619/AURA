import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAura, API } from '../../context/AuraContext';
import { COLOR, FONT } from '../../utils/tokens';

export default function AdminReports() {
  const { pushToast } = useAura();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API}/api/reports/admin/pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aura_token') || ''}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolve = async (salonId, reportId, status) => {
    try {
      const res = await fetch(`${API}/api/reports/admin/${salonId}/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aura_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        pushToast(`Report ${status}`, 'success');
        setReports(reports.filter(r => r.reportId !== reportId));
      } else {
        pushToast(data.error || 'Failed', 'error');
      }
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  if (loading) return <div style={S.center}>Loading reports...</div>;

  return (
    <div style={S.container}>
      <h1 style={S.title}>Pending Reports ({reports.length})</h1>
      {reports.length === 0 ? (
        <p style={{ color: COLOR.textMuted, fontFamily: FONT.mono, marginTop: '2rem' }}>No pending reports. All clear!</p>
      ) : (
        <div style={S.grid}>
          {reports.map(r => (
            <motion.div key={r.reportId} style={S.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={S.cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: FONT.display, color: COLOR.gold, fontSize: '1.2rem' }}>{r.salonName}</h3>
                  <span style={{ fontFamily: FONT.mono, fontSize: '0.75rem', color: COLOR.textMuted }}>{r.salonHub}</span>
                </div>
                <span style={{ background: 'rgba(239,83,80,0.1)', color: '#EF5350', padding: '0.3rem 0.6rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {r.reason}
                </span>
              </div>
              <div style={S.detailsBox}>
                <p style={{ margin: 0, fontFamily: FONT.body, fontSize: '0.9rem', color: COLOR.textPrimary }}>{r.details || 'No additional details provided.'}</p>
                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: COLOR.textGhost, fontFamily: FONT.mono }}>
                  Reported by: {r.user ? `${r.user.name} (${r.user.email})` : 'AURA AI / Guest'} <br/>
                  Date: {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={S.actions}>
                <button style={{ ...S.btn, background: 'rgba(76,175,80,0.1)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)' }} onClick={() => handleResolve(r.salonId, r.reportId, 'resolved')}>
                  Mark Resolved
                </button>
                <button style={{ ...S.btn, background: 'transparent', color: COLOR.textMuted, border: `1px solid rgba(255,255,255,0.1)` }} onClick={() => handleResolve(r.salonId, r.reportId, 'dismissed')}>
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: COLOR.gold, fontFamily: FONT.mono },
  container: { padding: 'clamp(1rem, 4vw, 3rem)', maxWidth: 1000, margin: '0 auto' },
  title: { fontFamily: FONT.display, fontSize: '2rem', color: COLOR.textPrimary, marginBottom: '2rem' },
  grid: { display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' },
  card: { background: 'rgba(15,15,15,0.6)', border: `1px solid rgba(212,175,55,0.15)`, borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  detailsBox: { background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' },
  actions: { display: 'flex', gap: '0.8rem', marginTop: 'auto' },
  btn: { flex: 1, padding: '0.7rem', borderRadius: 6, cursor: 'pointer', fontFamily: FONT.mono, fontSize: '0.8rem', fontWeight: 'bold' }
};
