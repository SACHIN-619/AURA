import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../../utils/tokens';
import { API } from '../../context/AuraContext';

export default function CoreBoutiqueMetrics() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    activeBookings: 0,
    conversionRate: 0,
    xpDistributed: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('aura_token');
    if (!token) {
      setError('Not authenticated.');
      setLoading(false);
      return;
    }

    fetch(`${API}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSalon(data.salon);
          setMetrics({
            todayRevenue: data.metrics.confirmedRevenue,
            activeBookings: data.metrics.activeBookings,
            conversionRate: data.metrics.conversionRate,
            xpDistributed: data.metrics.dynamicXp
          });
        } else {
          setError(data.error || 'Failed to load business metrics.');
        }
      })
      .catch(err => {
        console.error('Metrics fetch error:', err);
        setError('Network error fetching boutique metrics.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.8rem', color: COLOR.textMuted }}>
        Loading business metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.8rem', color: '#EF5350' }}>
        {error}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      style={S.container}
    >
      <div style={S.headerGrid}>
        <h2 style={S.heading}>{salon ? salon.name : 'Core Boutique Metrics'}</h2>
        <p style={S.subheading}>REAL-TIME BUSINESS ENGINE OVERVIEW &mdash; {salon?.hub?.toUpperCase()}</p>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <span style={S.label}>REVENUE (CONFIRMED/COMPLETED)</span>
          <span style={S.value}>₹{metrics.todayRevenue.toLocaleString('en-IN')}</span>
        </div>
        <div style={S.card}>
          <span style={S.label}>LIVE ACTIVE BOOKINGS</span>
          <span style={S.value}>{metrics.activeBookings}</span>
        </div>
        <div style={S.card}>
          <span style={S.label}>CONVERSION RATE</span>
          <span style={S.value}>{metrics.conversionRate}%</span>
        </div>
        <div style={S.card}>
          <span style={S.label}>CLIENT XP DISTRIBUTED</span>
          <span style={{ ...S.value, color: COLOR.gold }}>+{metrics.xpDistributed} XP</span>
        </div>
      </div>
    </motion.div>
  );
}

const S = {
  container: { padding: '1rem' },
  headerGrid: { marginBottom: '2rem' },
  heading: { fontFamily: FONT.display, fontSize: '1.6rem', color: COLOR.textPrimary, margin: 0, fontWeight: 300 },
  subheading: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.15em', marginTop: '0.2rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' },
  card: { background: 'rgba(18,14,24,0.65)', border: '1px solid rgba(212,175,55,0.15)', padding: '1.5rem', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.1em' },
  value: { fontFamily: FONT.display, fontSize: '1.8rem', color: COLOR.textPrimary, fontWeight: 300 }
};