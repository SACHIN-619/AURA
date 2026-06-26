// DynamicTranslate.jsx
// A lightweight component that renders dynamic strings (hub names, categories,
// distances, address parts) translated into the active locale via the backend
// /api/ai/translate endpoint. For English (code='en'), it just renders children.
// Results are cached in sessionStorage to avoid redundant API calls.
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API } from '../context/AuraContext';

const memCache = {}; // in-memory session cache: `${lang}::${text}` → translated string

async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  const key = `${targetLang}::${text}`;
  if (memCache[key]) return memCache[key];

  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem(`dt_${key}`);
    if (stored) { memCache[key] = stored; return stored; }
  } catch {}

  try {
    const res = await fetch(`${API}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: targetLang, context: 'location_category_ui' }),
    });
    const data = await res.json();
    if (data.success && data.translatedText) {
      memCache[key] = data.translatedText;
      try { sessionStorage.setItem(`dt_${key}`, data.translatedText); } catch {}
      return data.translatedText;
    }
    return text; // Do not cache failures
  } catch {
    return text; // Do not cache failures
  }
}

/**
 * <DynamicTranslate text="Jubilee Hills" />
 * Renders the text in the active language. Falls back to `text` on error.
 * For English locale, renders synchronously with zero network calls.
 */
export default function DynamicTranslate({ text, style, className }) {
  const { lang } = useLanguage();
  const [display, setDisplay] = useState(text);
  const lastKey = useRef('');

  useEffect(() => {
    const key = `${lang}::${text}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    if (lang === 'en' || !text) {
      setDisplay(text);
      return;
    }

    // Render original first for instant feedback, then update async
    setDisplay(text);
    translateText(text, lang).then(t => {
      if (lastKey.current === key) setDisplay(t);
    });
  }, [text, lang]);

  return (
    <span style={style} className={className}>
      {display || text}
    </span>
  );
}
