import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../../utils/tokens';

export default function PricingCategoryManager() {
  const [services, setServices] = useState([
    { id: 1, name: 'Signature Textured Crop Fade', category: 'Grooming', price: 1200 },
    { id: 2, name: 'Advanced Keratin Smoothing Treatment', category: 'Hair Therapy', price: 6500 },
    { id: 3, name: 'Luxury Charcoal Beard Sculpt', category: 'Grooming', price: 800 },
    { id: 4, name: 'Ozone Detox HydraFacial', category: 'Skincare', price: 3500 }
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      style={S.container}
    >
      <div style={S.headerGrid}>
        <h2 style={S.heading}>Pricing & Service Manager</h2>
        <p style={S.subheading}>CATALOG PROFILE CONFIGURATIONS</p>
      </div>

      <div style={S.tableContainer}>
        <table style={S.table}>
          <thead>
            <tr style={S.thRow}>
              <th style={S.th}>SERVICE NAME</th>
              <th style={S.th}>CATEGORY LAYER</th>
              <th style={S.th}>PRICE (INR)</th>
            </tr>
          </thead>
          <tbody>
            {services.map(srv => (
              <tr key={srv.id} style={S.tr}>
                <td style={S.tdName}>{srv.name}</td>
                <td style={S.tdCat}><span style={S.tag}>{srv.category.toUpperCase()}</span></td>
                <td style={S.tdPrice}>₹{srv.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

const S = {
  container: { padding: '1rem 0' },
  headerGrid: { marginBottom: '2rem' },
  heading: { fontFamily: FONT.display, fontSize: '1.6rem', color: COLOR.textPrimary, margin: 0, fontWeight: 300 },
  subheading: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.15em', marginTop: '0.2rem' },
  tableContainer: { background: 'rgba(18,14,24,0.45)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 6, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(212,175,55,0.1)' },
  th: { padding: '1rem', fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.gold, letterSpacing: '0.1em', fontWeight: 400 },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  tdName: { padding: '1rem', fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary },
  tdCat: { padding: '1rem' },
  tag: { fontFamily: FONT.mono, fontSize: '0.5rem', background: 'rgba(255,255,255,0.05)', color: COLOR.textMuted, padding: '0.2rem 0.4rem', borderRadius: 3, letterSpacing: '0.05em' },
  tdPrice: { padding: '1rem', fontFamily: FONT.mono, fontSize: '0.85rem', color: COLOR.textPrimary }
};