// RatingDisplay — fetches REAL aggregate rating stats for a salon from
// /api/ratings/salon/:id. Shows actual stars + verified count if any exist.
// If zero ratings exist, shows the animated RateItButton instead — never a
// fake placeholder number.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';
import RateItButton from './RateItButton';
import VerifiedBadge from './VerifiedBadge';
import RatingModal from './RatingModal';

export default function RatingDisplay({ salon }) {
  const [stats, setStats]   = useState(null); // null = loading
  const [reviews, setReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API}/api/ratings/salon/${salon._id}`);
      const d = await r.json();
      if (d.success) { setStats(d.stats); setReviews(d.reviews || []); }
      else setStats({ avgStars: null, totalCount: 0, verifiedCount: 0 });
    } catch {
      setStats({ avgStars: null, totalCount: 0, verifiedCount: 0 });
    }
  };

  useEffect(() => { if (salon?._id && !salon._isDemo) fetchStats(); }, [salon?._id]);

  if (salon._isDemo) {
    // Demo salons have no real backend record to rate against
    return <div style={S.demoNote}>Demo data — ratings unavailable</div>;
  }

  if (stats === null) {
    return <div style={S.loading}>Checking ratings…</div>;
  }

  if (stats.totalCount === 0) {
    return (
      <>
        <div style={S.emptyRow}>
          {/* 5 static empty stars */}
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} viewBox="0 0 100 100" width={12} height={12}>
              <path d="M50,8 L63,35 L93,39 L71,60 L76,90 L50,76 L24,90 L29,60 L7,39 L37,35 Z"
                fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="7" strokeLinejoin="round" />
            </svg>
          ))}
          {/* Compact hover-animated Rate It button inline */}
          <RateItButton onClick={() => setShowModal(true)} />
        </div>
        <AnimatePresence>
          {showModal && (
            <RatingModal
              salon={salon}
              onClose={() => setShowModal(false)}
              onSubmitted={() => { setShowModal(false); fetchStats(); }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }


  return (
    <>
      <button onClick={() => setShowModal(true)} style={S.ratingRow}>
        <Stars value={stats.avgStars} />
        <span style={S.avgNum}>{stats.avgStars.toFixed(1)}</span>
        <span style={S.count}>({stats.totalCount})</span>
        {stats.verifiedCount > 0 && (
          <span style={S.verifiedRow}>
            <VerifiedBadge size={12} />
            <span style={S.verifiedText}>{stats.verifiedCount} verified</span>
          </span>
        )}
      </button>
      <AnimatePresence>
        {showModal && (
          <RatingModal
            salon={salon}
            existingReviews={reviews}
            onClose={() => setShowModal(false)}
            onSubmitted={() => { setShowModal(false); fetchStats(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Stars({ value }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value > i && value < i + 1;
        return (
          <span key={i} style={{ position: 'relative', width: 12, height: 12, display: 'inline-block' }}>
            <StarShape color="rgba(212,175,55,0.2)" />
            {(filled || half) && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: half ? '50%' : '100%' }}>
                <StarShape color={COLOR.gold} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
function StarShape({ color }) {
  return (
    <svg viewBox="0 0 100 100" width="12" height="12">
      <path d="M50,8 L63,35 L93,39 L71,60 L76,90 L50,76 L24,90 L29,60 L7,39 L37,35 Z" fill={color} />
    </svg>
  );
}

const S = {
  emptyRow:     { display: 'flex', alignItems: 'center', gap: '0.2rem', flexWrap: 'nowrap' },
  ratingRow:    { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem 0' },
  avgNum:       { fontFamily: FONT.body, fontSize: '0.74rem', fontWeight: 600, color: COLOR.gold },
  count:        { fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.textGhost },
  verifiedRow:  { display: 'flex', alignItems: 'center', gap: '0.22rem', marginLeft: '0.2rem' },
  verifiedText: { fontFamily: FONT.body, fontSize: '0.66rem', fontWeight: 500, color: COLOR.gold },
  loading:      { fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.textGhost, fontStyle: 'italic' },
  demoNote:     { fontFamily: FONT.body, fontSize: '0.7rem', color: COLOR.textGhost, fontStyle: 'italic' },
};
