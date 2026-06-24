// i18n/LanguageContext.jsx
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LANGUAGES, getTranslator } from './translations.js';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'aura_lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  });

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private browsing — non-fatal */ }
    // Urdu is RTL — flip document direction so layout mirrors correctly
    document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr';
  }, []);

  const t = useMemo(() => getTranslator(lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
