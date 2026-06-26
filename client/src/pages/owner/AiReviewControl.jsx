// client/pages/owner/AiReviewControl.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FONT, COLOR } from '../../utils/tokens';
import { API } from '../../context/AuraContext';
import RatingDisplay from '../../components/RatingDisplay';

export default function AiReviewControl() {
  const [reviews, setReviews] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('aura_token');

  useEffect(() => {
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetch(`${API}/api/owner/reviews`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviews(data.reviews || []);
          setSentiment(data.sentiment);
        } else {
          setError(data.error || 'Failed to load review insights.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Network error loading review analytics.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.8rem', color: COLOR.textMuted }}>
        Loading AI review insights...
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

  const getSentimentColor = (s) => {
    if (s?.toLowerCase() === 'positive') return '#4CAF50';
    if (s?.toLowerCase() === 'negative') return '#EF5350';
    return COLOR.gold;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={S.container}
    >
      <h3 style={S.title}>✦ AI Sentiment Monitoring Hub</h3>
      <p style={S.subtitle}>Real-time monitoring of customer perception signals collected from platform reviews.</p>

      {sentiment && (
        <div style={S.sentimentDashboard}>
          {/* Summary Card */}
          <div style={S.summaryCard}>
            <div style={S.summaryMetric}>
              <div>
                <span style={S.label}>AGGREGATED SENTIMENT</span>
                <div style={{ ...S.value, color: getSentimentColor(sentiment.overallSentiment) }}>
                  {sentiment.overallSentiment || 'Neutral'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={S.label}>PERCEPTION STRENGTH</span>
                <div style={{ ...S.value, color: COLOR.gold }}>{sentiment.strength || 50}%</div>
              </div>
            </div>
            
            <div style={S.divider} />
            
            <span style={S.label}>AI EXECUTIVE SUMMARY</span>
            <p style={S.text}>{sentiment.summary}</p>
          </div>

          {/* Highlights & Growth Grid */}
          <div style={S.detailGrid}>
            <div style={S.metricCard}>
              <span style={{ ...S.label, color: '#4CAF50' }}>✦ KEY RECEPTION HIGHLIGHTS</span>
              <ul style={S.list}>
                {(sentiment.highlights || []).map((h, i) => (
                  <li key={i} style={S.listItem}>✓ {h}</li>
                ))}
                {(!sentiment.highlights || sentiment.highlights.length === 0) && (
                  <li style={S.listItemMuted}>Gathering positive signals...</li>
                )}
              </ul>
            </div>

            <div style={S.metricCard}>
              <span style={{ ...S.label, color: '#FFB74D' }}>⚠️ OPERATIONAL GROWTHERY</span>
              <ul style={S.list}>
                {(sentiment.growthAreas || []).map((g, i) => (
                  <li key={i} style={{ ...S.listItem, color: '#FFB74D' }}>• {g}</li>
                ))}
                {(!sentiment.growthAreas || sentiment.growthAreas.length === 0) && (
                  <li style={S.listItemMuted}>No critical friction points detected.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <h4 style={S.sectionHeading}>Customer Reviews Feed</h4>
      <div style={S.reviewsFeed}>
        {reviews.length === 0 ? (
          <div style={S.emptyState}>No reviews posted yet for this salon.</div>
        ) : (
          reviews.map(rev => (
            <div key={rev._id} style={S.reviewCard}>
              <div style={S.reviewHeader}>
                <div>
                  <span style={S.reviewerName}>{rev.customerName}</span>
                  {rev.isVerified && <span style={S.verifiedBadge}>AuraVerified</span>}
                </div>
                <div style={S.starsWrap}>
                  <RatingDisplay rating={rev.stars} size={14} />
                </div>
              </div>
              <p style={S.reviewComment}>"{rev.comment || 'No comment provided.'}"</p>
              <span style={S.reviewDate}>{new Date(rev.createdAt).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

const S = {
  container: { padding: '2rem', color: '#fff' },
  title: { fontFamily: FONT.display, fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: 300 },
  subtitle: { fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textMuted, margin: '0 0 2rem 0' },
  sentimentDashboard: { display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' },
  summaryCard: { background: 'rgba(18,14,24,0.75)', border: `1px solid rgba(212,175,55,0.2)`, borderRadius: 10, padding: '1.5rem' },
  summaryMetric: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, background: 'rgba(212,175,55,0.1)', margin: '1rem 0' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
  metricCard: { background: COLOR.glass, border: `1px solid ${COLOR.edge}`, borderRadius: 10, padding: '1.25rem', backdropFilter: 'blur(10px)' },
  label: { display: 'block', fontSize: '0.6rem', fontFamily: FONT.mono, color: COLOR.textMuted, marginBottom: '0.5rem', letterSpacing: '0.08em' },
  value: { fontFamily: FONT.display, fontSize: '1.6rem', fontWeight: 300 },
  text: { fontFamily: FONT.body, fontSize: '0.85rem', margin: 0, lineHeight: 1.5, color: COLOR.textPrimary },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  listItem: { fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textPrimary },
  listItemMuted: { fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textGhost },
  sectionHeading: { fontFamily: FONT.display, fontSize: '1.2rem', margin: '0 0 1.2rem 0', color: COLOR.textPrimary, fontWeight: 300 },
  reviewsFeed: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  emptyState: { padding: '2rem', background: 'rgba(18,14,24,0.3)', border: '1px dashed rgba(212,175,55,0.15)', borderRadius: 8, textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.75rem', color: COLOR.textGhost },
  reviewCard: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontFamily: FONT.body, fontSize: '0.9rem', fontWeight: 600, color: COLOR.textPrimary },
  verifiedBadge: { marginLeft: '0.5rem', background: 'rgba(212,175,55,0.12)', color: COLOR.gold, padding: '0.1rem 0.4rem', borderRadius: 3, fontFamily: FONT.mono, fontSize: '0.55rem', border: '1px solid rgba(212,175,55,0.2)' },
  starsWrap: { display: 'flex' },
  reviewComment: { fontFamily: FONT.body, fontSize: '0.82rem', color: COLOR.textMuted, margin: 0, fontStyle: 'italic' },
  reviewDate: { fontFamily: FONT.mono, fontSize: '0.6rem', color: COLOR.textGhost }
};