import { useState, useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAura } from '../../context/AuraContext';
import { COLOR, FONT } from '../../utils/tokens';

export default function OwnerDashboardLayout() {
  const { user } = useAura();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation in mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="owner-layout">
      <button 
        className="owner-hamburger" 
        onClick={() => setMobileOpen(o => !o)}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Control Drawer Navigation */}
      <aside className={`owner-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div style={S.brandNode}>
          <h1 style={S.logo}>AURA CONTROL</h1>
          <span style={S.role}>BOUTIQUE CONSOLE</span>
        </div>
        
        <nav style={S.nav}>
          <NavLink to="/owner/dashboard" end style={({ isActive }) => isActive ? S.activeLink : S.link}>
            📈 Performance Grid
          </NavLink>
          <NavLink to="/owner/dashboard/services" style={({ isActive }) => isActive ? S.activeLink : S.link}>
            ✂️ Menu & AI Pricing
          </NavLink>
          <NavLink to="/owner/dashboard/reviews" style={({ isActive }) => isActive ? S.activeLink : S.link}>
            💬 Review Sentiment
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area Workspace */}
      <main className="owner-main">
        <Outlet />
      </main>
    </div>
  );
}

const S = {
  brandNode: { paddingLeft: '0.5rem' },
  logo: { fontFamily: FONT.display, fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em', color: COLOR.textPrimary },
  role: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.gold, letterSpacing: '0.15em' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  link: { display: 'block', padding: '0.75rem 1rem', borderRadius: 8, color: COLOR.textMuted, textDecoration: 'none', fontFamily: FONT.body, fontSize: '0.85rem', transition: 'all 0.2s' },
  activeLink: { display: 'block', padding: '0.75rem 1rem', borderRadius: 8, color: COLOR.gold, background: 'rgba(212,175,55,0.08)', borderLeft: `3px solid ${COLOR.gold}`, textDecoration: 'none', fontFamily: FONT.body, fontSize: '0.85rem', fontWeight: 600 }
};