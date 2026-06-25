import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuraProvider, useAura } from './context/AuraContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlassSidebar from './components/GlassSidebar';
import SalonGrid from './components/SalonGrid';
import AiBar from './components/AiBar';
import Toast from './components/Toast';
import LocationOnboarding from './components/LocationOnboarding';
import AuraMirror from './components/AuraMirror';
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

function AppShell({ showApp }) {
  const { syncing, activeHub, onboarded, loadHubList, syncHub, allHubs } = useAura();
  const [onbDone, setOnbDone] = useState(false);
  const [showMirror, setShowMirror] = useState(false);

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
      <AnimatePresence>
        {showMirror && <AuraMirror key="mir" onClose={() => setShowMirror(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showApp && (onboarded || onbDone) && (
          <motion.div key="shell" style={S.shell} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={S.grain} />
            <ErrorBoundary><GlassSidebar /></ErrorBoundary>
            {/* main-content class enables responsive CSS from index.css */}
            <main className="main-content" style={S.main}>
              <div style={{ position: 'relative', width: '100%', height: '2.5rem' }}>
                <AccountButton />
              </div>
              <MainAppRoutes />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast />
      <LanguageSelector />
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
  // shell: sidebar (240px fixed) + main fills the rest
  shell:      { display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 },
  // Inline default — overridden to margin-left:0 on mobile via .main-content class in index.css
  main:       { marginLeft: 240, flex: 1, padding: '1.5rem 2rem', minHeight: '100vh', boxSizing: 'border-box' },
  header:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' },
  title:      { fontFamily: FONT.display, fontSize: '2.2rem', fontWeight: 300, color: COLOR.textPrimary, margin: 0, letterSpacing: '0.01em' },
  sub:        { fontFamily: FONT.mono, fontSize: '0.5rem', letterSpacing: '0.2em', color: COLOR.textMuted, marginTop: '0.4rem' },
  aiReplyBanner: { fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textMuted, marginTop: '0.4rem', fontStyle: 'italic' },
  grain:      { position: 'fixed', inset: 0, zIndex: 0, opacity: 0.02, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` },
  accountWrap:{ position: 'absolute', top: '0rem', right: '0rem', zIndex: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' },
  accountBtn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4, cursor: 'pointer', fontFamily: FONT.body, fontSize: '0.75rem', color: COLOR.textPrimary },
  accountDot: { width: 5, height: 5, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 5px #4CAF50' },
  logoutMini: { width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18,14,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4, cursor: 'pointer', color: COLOR.textGhost, fontSize: '0.7rem' },
};