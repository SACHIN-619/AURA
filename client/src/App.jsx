import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuraProvider, useAura } from './context/AuraContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlassSidebar from './components/GlassSidebar';
import SalonGrid from './components/SalonGrid';
import AiBar from './components/AiBar';
import Toast from './components/Toast';
import LocationOnboarding from './components/LocationOnboarding';
import AuraMirror from './components/AuraMirror';
import AiChatbot from './components/AiChatbot';
import LanguageSelector from './components/LanguageSelector';
import AuthModal from './components/AuthModal';
import MyAccount from './components/MyAccount';
import { IntroOverlay, HubLoader } from './components/CinematicOverlays';
import { COLOR, FONT } from './utils/tokens';
import { Routes, Route } from 'react-router-dom';
import OwnerDashboardLayout from './pages/owner/OwnerDashboardLayout';
import CoreBoutiqueMetrics from './pages/owner/CoreBoutiqueMetrics';
import PricingCategoryManager from './pages/owner/PricingCategoryManager';
import AiReviewControl from './pages/owner/AiReviewControl';

// ── Text Scale Levels ──────────────────────────────────────────────────────
const FONT_SCALES = [
  { label: 'A',   value: 1 },
  { label: 'A+',  value: 1.12 },
  { label: 'A++', value: 1.24 },
];

function TextScaleControls({ scale, setScale }) {
  return (
    <div style={S.scaleWrap}>
      {FONT_SCALES.map(({ label, value }) => {
        const active = Math.abs(scale - value) < 0.01;
        return (
          <button
            key={label}
            onClick={() => {
              setScale(value);
              document.documentElement.style.setProperty('--font-scale', String(value));
            }}
            style={{
              ...S.scaleBtn,
              ...(active ? S.scaleBtnActive : {}),
              fontSize: label === 'A' ? '0.64rem' : label === 'A+' ? '0.72rem' : '0.8rem',
            }}
            title={`Text size: ${label}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MainAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainAuraGrid />} />
      <Route path="/owner/dashboard" element={<OwnerDashboardLayout />}>
        <Route index element={<CoreBoutiqueMetrics />} />
        <Route path="services" element={<PricingCategoryManager />} />
        <Route path="reviews" element={<AiReviewControl />} />
      </Route>
    </Routes>
  );
}

function MainAuraGrid() {
  return (
    <>
      <PageHeader />
      <AiBar />
      <ErrorBoundary>
        <SalonGrid />
      </ErrorBoundary>
    </>
  );
}

function AccountButton() {
  const { user, setUser, authModalOpen, setAuthModalOpen } = useAura();
  const [showAccount, setShowAccount] = useState(false);

  const logout = (e) => {
    e.stopPropagation();
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    if (setUser) setUser(null);
    setShowAccount(false);
  };

  return (
    <>
      {user ? (
        <div className="account-wrap" style={S.accountWrap}>
          <button onClick={() => setShowAccount(true)} style={S.accountBtn}>
            <span style={S.accountDot} /> {user.name ? user.name.split(' ')[0] : 'User'}
          </button>
          <button onClick={logout} style={S.logoutMini}>⏻</button>
        </div>
      ) : (
        <div className="account-wrap" style={S.accountWrap}>
          <button onClick={() => setAuthModalOpen?.(true)} style={S.accountBtn}>Log in</button>
        </div>
      )}
      <AnimatePresence>
        {authModalOpen && <AuthModal key="auth" onClose={() => setAuthModalOpen?.(false)} onAuthed={(u) => setUser?.(u)} />}
        {showAccount && <MyAccount key="account" onClose={() => setShowAccount(false)} />}
      </AnimatePresence>
    </>
  );
}

function PageHeader() {
  const { activeHub, aiReply } = useAura();
  const defaultCity = import.meta.env.VITE_MARKETPLACE_DEFAULT_CITY || 'Your City';
  return (
    <motion.div style={S.header} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 style={S.title}>
          Discover <span style={{ color: COLOR.gold }}>{activeHub || defaultCity}</span>
        </h1>
        <p style={S.sub}>PREMIUM LUXURY SALONS · LIVE ASSISTED REGIONAL CLUSTERS</p>
        {aiReply && (
          <motion.p
            style={S.aiReplyBanner}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ✦ {aiReply}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ── Top Bar — Language + Account + Text Scale, all inline ─────────────────
function TopBar({ fontScale, setFontScale }) {
  return (
    <div style={S.topBar}>
      <TextScaleControls scale={fontScale} setScale={setFontScale} />
      <LanguageSelector />
      <AccountButton />
    </div>
  );
}

function AppShell({ showApp }) {
  const { syncing, activeHub, onboarded, loadHubList, syncHub, allHubs } = useAura();
  const [onbDone, setOnbDone] = useState(false);
  const [showMirror, setShowMirror] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load hub list when app becomes visible
  useEffect(() => {
    if (showApp && loadHubList) {
      loadHubList();
    }
  }, [showApp, loadHubList]);

  // Auto-sync first hub once hubs are loaded, if user skipped onboarding
  useEffect(() => {
    if (onbDone && allHubs.length > 0 && !activeHub) {
      const firstHub = allHubs[0]?.hub || allHubs[0];
      if (firstHub && typeof firstHub === 'string') syncHub(firstHub);
    }
  }, [onbDone, allHubs, activeHub, syncHub]);

  const showOnboarding = showApp && !onboarded && !onbDone;

  return (
    <>
      <HubLoader hubName={activeHub} isVisible={syncing} />
      <AnimatePresence>
        {showOnboarding && (
          <LocationOnboarding key="onb" onComplete={() => setOnbDone(true)} />
        )}
      </AnimatePresence>

      {/* AuraMirror — floating middle bottom, accessible to guests */}
      <AnimatePresence>
        {showMirror && <AuraMirror key="mir" onClose={() => setShowMirror(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showApp && (onboarded || onbDone) && (
          <motion.div key="shell" style={S.shell} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={S.grain} />
            <ErrorBoundary><GlassSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} /></ErrorBoundary>

            {/* main-content class enables responsive CSS from index.css */}
            <main className="main-content" style={{ ...S.main, marginLeft: sidebarCollapsed ? 50 : 240, transition: 'margin-left 0.25s ease' }}>
              {/* Fixed top-right bar: A/A+/A++ · Language · Account */}
              <TopBar fontScale={fontScale} setFontScale={setFontScale} />
              <MainAppRoutes />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast />

      {/* Floating AuraMirror trigger — bottom center, always visible to guests */}
      {showApp && (onboarded || onbDone) && (
        <motion.button
          style={S.mirrorFab}
          onClick={() => setShowMirror(v => !v)}
          whileHover={{ scale: 1.08, boxShadow: '0 0 24px rgba(212,175,55,0.4)' }}
          whileTap={{ scale: 0.95 }}
          title="AURA Mirror — Try your style virtually"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          🪞
          <span style={S.fabLabel}>Mirror</span>
        </motion.button>
      )}

      {/* Floating AiChatbot — bottom right, always accessible to guests */}
      {showApp && (onboarded || onbDone) && (
        <div style={S.chatbotFab}>
          <AiChatbot currentHub={activeHub} />
        </div>
      )}
    </>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowIntro(false), 1500);
    const t2 = setTimeout(() => setShowApp(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ background: COLOR.voidDeep, minHeight: '100vh' }}>
      <AuraProvider>
        <AnimatePresence>{showIntro && <IntroOverlay key="intro" />}</AnimatePresence>
        <AppShell showApp={showApp} />
      </AuraProvider>
    </div>
  );
}

const S = {
  // Layout
  shell:      { display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 },
  main:       { marginLeft: 240, flex: 1, padding: '0 2rem 2rem', minHeight: '100vh', boxSizing: 'border-box', position: 'relative' },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '1rem' },
  title:      { fontFamily: FONT.display, fontSize: '2.2rem', fontWeight: 300, color: COLOR.textPrimary, margin: 0, letterSpacing: '0.01em' },
  sub:        { fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: COLOR.textMuted, marginTop: '0.4rem' },
  aiReplyBanner: { fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textMuted, marginTop: '0.4rem', fontStyle: 'italic' },
  grain:      { position: 'fixed', inset: 0, zIndex: 0, opacity: 0.02, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` },

  // ── Top Bar (fixed, right-aligned row inside main) ────────────────────
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    padding: '0.55rem 0',
    marginBottom: '0.25rem',
    backdropFilter: 'blur(12px)',
    background: 'rgba(3,2,4,0.6)',
    borderBottom: '1px solid rgba(212,175,55,0.06)',
  },

  // Text Scale
  scaleWrap: { display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0 0.3rem', borderRight: '1px solid rgba(212,175,55,0.15)', marginRight: '0.2rem' },
  scaleBtn:  { padding: '0.22rem 0.45rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 4, color: COLOR.textGhost, cursor: 'pointer', fontFamily: FONT.body, fontWeight: 600, transition: 'all 0.18s', lineHeight: 1 },
  scaleBtnActive: { borderColor: COLOR.gold, color: COLOR.gold, background: 'rgba(212,175,55,0.08)' },

  // Account
  accountWrap:{ display: 'flex', alignItems: 'center', gap: '0.4rem' },
  accountBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4, cursor: 'pointer', fontFamily: FONT.body, fontSize: '0.75rem', color: COLOR.textPrimary },
  accountDot: { width: 5, height: 5, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 5px #4CAF50' },
  logoutMini: { width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4, cursor: 'pointer', color: COLOR.textGhost, fontSize: '0.7rem' },

  // Floating Buttons
  mirrorFab: {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    padding: '0.6rem 1rem',
    background: 'rgba(13,10,19,0.92)',
    border: '1px solid rgba(212,175,55,0.35)',
    borderRadius: 24,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(16px)',
    fontSize: '1.1rem',
    transition: 'box-shadow 0.2s',
  },
  fabLabel: { fontFamily: FONT.mono, fontSize: '0.38rem', color: COLOR.goldDim, letterSpacing: '0.12em', lineHeight: 1 },

  chatbotFab: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    zIndex: 1200,
  },
};