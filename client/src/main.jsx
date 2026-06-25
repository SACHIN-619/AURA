import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';

// Lightweight path-based routing — only two real "pages" exist, so a full
// router is unnecessary weight. /admin is internal-only and never linked
// from the public app, and stays English-only since it's an operator tool.
const isAdmin = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {isAdmin ? <AdminDashboard /> : (
        <LanguageProvider>
          <App />
        </LanguageProvider>
      )}
    </BrowserRouter>
  </StrictMode>
);
