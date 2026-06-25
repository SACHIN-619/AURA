// client/pages/owner/AiReviewControl.jsx
import { FONT, COLOR } from '../../utils/tokens';

export default function AiReviewControl() {
  // Demo context representing pipeline payload
  const reviewAnalytics = {
    overallSentiment: "Highly Positive (89%)",
    primaryStrength: "Exceptional Balayage & Premium Hospitality hospitality",
    growthOpportunity: "Slight wait-times detected around Friday evenings (4 PM - 7 PM)"
  };

  return (
    <div style={S.container}>
      <h3 style={S.title}>✦ AI Sentiment Monitoring Hub</h3>
      <p style={S.subtitle}>Real-time monitoring of customer perception signals collected from platform actions.</p>

      <div style={S.grid}>
        <div style={S.metricCard}>
          <span style={S.label}>AGGREGATED SENTIMENT</span>
          <div style={S.value}>{reviewAnalytics.overallSentiment}</div>
        </div>

        <div style={S.metricCard}>
          <span style={S.label}>CORE VALUE STRENGTH</span>
          <p style={S.text}>{reviewAnalytics.primaryStrength}</p>
        </div>

        <div style={S.metricCard}>
          <span style={S.label}>OPERATIONAL BOTTLENECK INSIGHT</span>
          <p style={{ ...S.text, color: '#FFB74D' }}>⚠️ {reviewAnalytics.growthOpportunity}</p>
        </div>
      </div>
    </div>
  );
}

const S = {
  container: { padding: '2rem', color: '#fff' },
  title: { fontFamily: FONT.display, fontSize: '1.5rem', margin: '0 0 0.5rem 0' },
  subtitle: { fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textMuted, margin: '0 0 2rem 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
  metricCard: { background: COLOR.glass, border: `1px solid ${COLOR.edge}`, borderRadius: 12, padding: '1.25rem', backdropFilter: 'blur(10px)' },
  label: { display: 'block', fontSize: '0.65rem', fontFamily: FONT.mono, color: COLOR.gold, marginBottom: '0.5rem', letterSpacing: '0.08em' },
  value: { fontFamily: FONT.display, fontSize: '1.4rem', color: '#4CAF50', fontWeight: 'bold' },
  text: { fontFamily: FONT.body, fontSize: '0.82rem', margin: 0, lineHeight: 1.4, color: COLOR.textPrimary }
};