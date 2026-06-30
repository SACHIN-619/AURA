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
import DynamicTranslate from './components/DynamicTranslate';
import NotificationCenter from './components/NotificationCenter';
import { COLOR, FONT } from './utils/tokens';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import OwnerDashboardLayout from './pages/owner/OwnerDashboardLayout';
import CoreBoutiqueMetrics from './pages/owner/CoreBoutiqueMetrics';
import PricingCategoryManager from './pages/owner/PricingCategoryManager';
import AiReviewControl from './pages/owner/AiReviewControl';
import AdminDashboard from './components/AdminDashboard';
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout';
import AdminSalonManager from './pages/admin/AdminSalonManager';
import ProposeSalon from './pages/ProposeSalon';

// ── Text Scale Levels ──────────────────────────────────────────────────────
const FONT_SCALES = [
  { label: 'A',   value: 1 },
  { label: 'A+',  value: 1.12 },
  { label: 'A++', value: 1.24 },
];

function TextScaleControls({ scale, setScale }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(212,175,55,0.15)', paddingRight: '0.4rem' }}>
      <select
        value={scale}
        onChange={(e) => {
          const value = parseFloat(e.target.value);
          setScale(value);
          document.documentElement.style.setProperty('--font-scale', String(value));
        }}
        style={{
          background: 'rgba(18,14,24,0.85)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 4,
          color: COLOR.textPrimary,
          fontFamily: FONT.sans,
          fontSize: '0.75rem',
          padding: '0.35rem 0.2rem',
          cursor: 'pointer',
          outline: 'none'
        }}
        title="Text size"
      >
        {FONT_SCALES.map(({ label, value }) => (
          <option key={label} value={value} style={{ background: COLOR.voidDeep, color: COLOR.textPrimary }}>
            {label}
          </option>
        ))}
      </select>
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
      {/* Admin routes handled at top level — outside AppShell */}
      <Route path="/propose-shop" element={<ProposeSalon />} />
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
          <DynamicTranslate text="Discover" /> <span style={{ color: COLOR.gold }}><DynamicTranslate text={activeHub || defaultCity} /></span>
        </h1>
        <p style={S.sub}><DynamicTranslate text="PREMIUM LUXURY SALONS · LIVE ASSISTED REGIONAL CLUSTERS" /></p>
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
function TopBar({ fontScale, setFontScale, activeHub, openOnboarding }) {
  return (
    <div style={S.topBar}>
      <div style={{ flex: 1 }}></div> {/* Spacer to push everything right */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'flex-end' }}>
        <button style={{ ...S.accountBtn, padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(212,175,55,0.3)' }} onClick={openOnboarding} title="Change Location">
          📍 {activeHub || 'Hyderabad'}
        </button>
        <TextScaleControls scale={fontScale} setScale={setFontScale} />
        <LanguageSelector />
        <NotificationCenter />
        <AccountButton />
      </div>
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

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const showOnboarding = (showApp && !onboarded && !onbDone) || forceOnboarding;
  const [showInactivity, setShowInactivity] = useState(false);
  const { user, setUser, authModalOpen, setAuthModalOpen } = useAura();

  // ── Admin redirect — render-time, no flash ────────────────────────────────
  // If the user is logged in as admin and NOT on /admin, redirect immediately.
  // This is checked at render time so there is never a flash of the user UI.
  if (user?.role === 'admin' && !window.location.pathname.startsWith('/admin')) {
    window.location.replace('/admin');
    return null;
  }

  // Inactivity Timer
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      // If user is guest, show popup after 2 minutes (120000ms)
      if (!user) {
        timeout = setTimeout(() => setShowInactivity(true), 120000);
      }
    };
    
    if (!user) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer);
      resetTimer();
    }
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [user]);

  const closeOnboarding = () => {
    setOnbDone(true);
    setForceOnboarding(false);
  };

  return (
    <>
      <HubLoader hubName={activeHub} isVisible={syncing} />
      <AnimatePresence>
        {showOnboarding && (
          <LocationOnboarding key="onb" onComplete={closeOnboarding} />
        )}
      </AnimatePresence>


      {/* AuraMirror — floating middle bottom, accessible to guests */}
      <AnimatePresence>
        {showMirror && <AuraMirror key="mir" onClose={() => setShowMirror(false)} />}
      </AnimatePresence>

      {/* AuthModal at root level so it is centered on screen without parent transforms */}
      <AnimatePresence>
        {authModalOpen && (
          <AuthModal 
            key="auth" 
            onClose={() => setAuthModalOpen?.(false)} 
            onAuthed={(u) => {
              if (setUser) setUser(u);
              if (u?.role === 'admin') {
                window.location.replace('/admin');
              }
            }} 
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showApp && (onboarded || onbDone) && (
          <motion.div key="shell" style={S.shell} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={S.grain} />
            <ErrorBoundary><GlassSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} /></ErrorBoundary>

            {/* main-content class enables responsive CSS from index.css */}
            <main className="main-content" style={{ ...S.main, marginLeft: sidebarCollapsed ? 50 : 240, transition: 'margin-left 0.25s ease' }}>
              {/* Fixed top-right bar: A/A+/A++ · Language · Account */}
              <TopBar fontScale={fontScale} setFontScale={setFontScale} activeHub={activeHub} openOnboarding={() => setForceOnboarding(true)} />
              <MainAppRoutes />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInactivity && (
          <motion.div style={S.inactivityOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={S.inactivityBox} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👋</div>
              <h3 style={{ fontFamily: FONT.display, fontSize: '1.4rem', color: COLOR.textPrimary, margin: '0 0 0.5rem 0' }}>Still looking around?</h3>
              <p style={{ fontFamily: FONT.mono, fontSize: '0.45rem', letterSpacing: '0.1em', color: COLOR.textMuted, lineHeight: 1.6, marginBottom: '1.2rem' }}>
                Create a free account to unlock AI style insights, claim XP rewards, and book verified luxury salons across Hyderabad.
              </p>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button style={S.inactivityBtnSec} onClick={() => setShowInactivity(false)}>Maybe later</button>
                <button style={S.inactivityBtnPrim} onClick={() => { setShowInactivity(false); setAuthModalOpen(true); }}>Log In / Sign Up</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


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

    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
    };
  }, []);

  return (
    <div style={{ background: COLOR.voidDeep, minHeight: '100vh' }}>
      <AuraProvider>
        {/* Admin routes are rendered OUTSIDE AppShell — no user sidebar/topbar */}
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/salons" element={<AdminDashboardLayout />}>
            <Route index element={<AdminSalonManager />} />
          </Route>
          <Route path="*" element={
            <>
              <AnimatePresence>{showIntro && <IntroOverlay key="intro" />}</AnimatePresence>
              <AppShell showApp={showApp} />
            </>
          } />
        </Routes>
        <Toast />
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
    padding: '0.6rem 1.5rem', background: 'rgba(13,10,19,0.95)', borderBottom: '1px solid rgba(212,175,55,0.15)',
    position: 'sticky', top: 0, zIndex: 1000, backdropFilter: 'blur(10px)'
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