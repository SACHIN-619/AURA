import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../../utils/tokens';

export default function CoreBoutiqueMetrics() {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    activeBookings: 0,
    conversionRate: 0,
    xpDistributed: 0
  });

  useEffect(() => {
    // Initial placeholder simulation matrix
    setMetrics({
      todayRevenue: 24500,
      activeBookings: 14,
      conversionRate: 68,
      xpDistributed: 450
    });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      style={S.container}
    >
      <div style={S.headerGrid}>
        <h2 style={S.heading}>Core Boutique Metrics</h2>
        <p style={S.subheading}>REAL-TIME BUSINESS ENGINE OVERVIEW</p>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <span style={S.label}>TODAY'S ESTIMATED REVENUE</span>
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
  container: { padding: '1rem 0' },
  headerGrid: { marginBottom: '2rem' },
  heading: { fontFamily: FONT.display, fontSize: '1.6rem', color: COLOR.textPrimary, margin: 0, fontWeight: 300 },
  subheading: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.15em', marginTop: '0.2rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' },
  card: { background: 'rgba(18,14,24,0.65)', border: '1px solid rgba(212,175,55,0.15)', padding: '1.5rem', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.1em' },
  value: { fontFamily: FONT.display, fontSize: '1.8rem', color: COLOR.textPrimary, fontWeight: 300 }
};