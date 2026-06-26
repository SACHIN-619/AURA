// client/pages/owner/OwnerDashboardLayout.jsx
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAura } from '../../context/AuraContext';
import { COLOR, FONT } from '../../utils/tokens';

export default function OwnerDashboardLayout() {
  const { user } = useAura();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }
  return (
    <div style={S.wrapper}>
      {/* Control Drawer Navigation */}
      <aside style={S.sidebar}>
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
      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  );
}

const S = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#09070f' },
  sidebar: { width: 260, background: 'rgba(15,11,22,0.85)', borderRight: `1px solid ${COLOR.edge}`, padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' },
  brandNode: { paddingLeft: '0.5rem' },
  logo: { fontFamily: FONT.display, fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em', color: COLOR.textPrimary },
  role: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.gold, letterSpacing: '0.15em' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  link: { display: 'block', padding: '0.75rem 1rem', borderRadius: 8, color: COLOR.textMuted, textDecoration: 'none', fontFamily: FONT.body, fontSize: '0.85rem', transition: 'all 0.2s' },
  activeLink: { display: 'block', padding: '0.75rem 1rem', borderRadius: 8, color: COLOR.gold, background: 'rgba(212,175,55,0.08)', borderLeft: `3px solid ${COLOR.gold}`, textDecoration: 'none', fontFamily: FONT.body, fontSize: '0.85rem', fontWeight: 600 },
  main: { flex: 1, background: 'radial-gradient(circle at top right, #140e1f, #09070f)', overflowY: 'auto' }
};