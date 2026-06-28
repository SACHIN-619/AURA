import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Outlet } from 'react-router-dom';
import { COLOR, FONT } from '../../utils/tokens';

export default function AdminDashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={S.container}>
      {/* Mobile Header with Hamburger */}
      <div style={S.mobileHeader} className="admin-mobile-header">
        <h2 style={{ fontFamily: FONT.display, fontSize: '1.2rem', margin: 0, color: COLOR.textPrimary }}>
          AURA <span style={{ color: COLOR.gold }}>ADMIN</span>
        </h2>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={S.hamburger}>
          ☰
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && !collapsed && (
          <motion.div
            style={S.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="admin-overlay"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.nav
        className="admin-sidebar"
        style={{
          ...S.sidebar,
          width: collapsed ? '60px' : '240px',
          transform: sidebarOpen || collapsed ? 'translateX(0)' : undefined,
        }}
      >
        <div style={{ ...S.sidebarHeader, justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '1.5rem 0' : '1.5rem 1rem' }}>
          {!collapsed && (
            <h2 style={{ fontFamily: FONT.display, fontSize: '1.4rem', margin: 0, color: COLOR.textPrimary }}>
              AURA <span style={{ color: COLOR.gold }}>ADMIN</span>
            </h2>
          )}
          <button 
            style={S.closeSidebar} 
            className="admin-minimize-btn" 
            onClick={() => setCollapsed(!collapsed)}
            title="Toggle Sidebar"
          >
            {collapsed ? '☰' : '◀'}
          </button>
        </div>
        
        <div style={{ ...S.navLinks, padding: collapsed ? '1rem 0' : '1rem', alignItems: collapsed ? 'center' : 'stretch' }}>
          <NavLink 
            to="/admin/salons" 
            style={({isActive}) => isActive ? {...S.navLink, ...S.navLinkActive, justifyContent: collapsed ? 'center' : 'flex-start'} : {...S.navLink, justifyContent: collapsed ? 'center' : 'flex-start'}} 
            onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
            title="Add Salon"
          >
            ✦ {!collapsed && <span>Add Salon</span>}
          </NavLink>
          <NavLink 
            to="/admin/reports" 
            style={({isActive}) => isActive ? {...S.navLink, ...S.navLinkActive, justifyContent: collapsed ? 'center' : 'flex-start'} : {...S.navLink, justifyContent: collapsed ? 'center' : 'flex-start'}} 
            onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
            title="Reports"
          >
            🚩 {!collapsed && <span>Reports</span>}
          </NavLink>
        </div>
        
        <div style={{ padding: collapsed ? '1rem 0' : '1rem', marginTop: 'auto', borderTop: `1px solid rgba(212,175,55,0.15)`, display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
          <NavLink 
            to="/" 
            style={{ ...S.navLink, justifyContent: collapsed ? 'center' : 'flex-start' }} 
            onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
            title="Back to App"
          >
            ← {!collapsed && <span>Back to App</span>}
          </NavLink>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main style={S.mainContent}>
        <Outlet />
      </main>

      <style>{`
        .admin-mobile-header { display: none; }
        
        @media (max-width: 768px) {
          .admin-mobile-header { display: flex !important; }
          .admin-sidebar {
            transform: translateX(-100%);
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1000;
          }
          .admin-overlay { display: block; }
        }
        @media (min-width: 769px) {
          .admin-sidebar {
            transform: translateX(0) !important;
          }
          .admin-overlay { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: COLOR.voidDeep,
    color: COLOR.textPrimary,
  },
  mobileHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'rgba(13,10,19,0.95)',
    borderBottom: `1px solid rgba(212,175,55,0.15)`,
    position: 'sticky',
    top: 0,
    zIndex: 900,
  },
  hamburger: {
    background: 'transparent',
    border: 'none',
    color: COLOR.gold,
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 950,
  },
  sidebar: {
    background: 'rgba(13,10,19,0.98)',
    borderRight: `1px solid rgba(212,175,55,0.15)`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    overflowX: 'hidden',
  },
  sidebarHeader: {
    borderBottom: `1px solid rgba(212,175,55,0.15)`,
    display: 'flex',
    alignItems: 'center',
  },
  closeSidebar: {
    background: 'transparent',
    border: 'none',
    color: COLOR.gold,
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.5rem',
  },
  navLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    color: COLOR.textGhost,
    textDecoration: 'none',
    fontFamily: FONT.body,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    gap: '0.5rem',
  },
  navLinkActive: {
    background: 'rgba(212,175,55,0.1)',
    color: COLOR.gold,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    width: '100%',
  }
};
