import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API } from '../context/AuraContext';

const LanguageContext = createContext(null);

const ENGLISH_DICT = {
  // brand / onboarding
  'brand_tagline': 'PREMIUM GROOMING & LUXURY WELLNESS',
  'onboard_pip_title': 'Find Your Luxury Hub',
  'onboard_pip_sub': 'Locate the nearest premier salon cluster tailored to your aesthetic',
  'onboard_use_location': 'Use My Location',
  'onboard_search_location': 'Search for Location',
  'onboard_skip': 'Skip onboarding',
  'onboard_locating': 'Pinpointing location...',
  'onboard_locating_sub': 'Contacting GPS networks for geographical context parameters...',
  'onboard_search_trouble': 'Search manually instead',
  'onboard_denied': 'Location access denied. Please select your hub manually.',
  'onboard_search_placeholder': 'Search luxury hubs...',
  'onboard_back': 'Go Back',
  'onboard_popular_areas': 'POPULAR OPERATIONAL HUBS',
  
  // salon cards / UI
  'card_category_unlisted': 'Unlisted Services',
  'card_contact': 'BOOK SESSION',
  'card_route': 'Directions',
  
  // booking / dialogs
  'booking_title': 'Reserve Luxury Experience',
  'booking_subtitle': 'Select your preferred service options & slots',
  'booking_phone': 'Phone Number',
  'booking_notes': 'Special Requests / Barber Preference',
  'booking_slot_select': 'Select Timing Matrix',
  'booking_confirm': 'CONFIRM BOOKING',
  'booking_success': 'Booking Confirmed!',
  'booking_success_sub': 'Your luxury groom session has been secured in the hub matrix.',
  'booking_success_whatsapp': 'Notify Barber on WhatsApp',
  'booking_close': 'Close Gateway',

  // sidebar / search / account
  'sidebar_find_hub': 'Discover Hubs',
  'sidebar_search_areas': 'Search areas...',
  'sidebar_filter_category': 'Filter Category',
  'sidebar_serves': 'Serves',
  'sidebar_home': 'Discover Hubs',
  'sidebar_mirror': 'Aura Mirror AI',
  'sidebar_account': 'My Profile Matrix',
  'sidebar_dashboard': 'Barber Portal',
  'sidebar_featured': 'Featured Salons',
  'sidebar_all': 'All Hub Salons',
  'sidebar_active_filters': 'Active Filters',
  'sidebar_clear_filters': 'Clear Matrices',

  // account page
  'account_title': 'User Profile Node',
  'account_level': 'Aura Tier Level',
  'account_xp': 'XP Progress Node',
  'account_history': 'Booking Transactions',
  'account_no_bookings': 'No active session tickets registered.',
  'account_xp_logs': 'XP Reward Allocation Registry',
  'account_xp_source': 'Trigger Source',
  'account_xp_amount': 'XP Granted',
  
  // rating / reviews
  'rating_comment_placeholder': 'Write a review...',
  'rating_submit': 'Submit Rating',
  'rating_rate_it': 'Rate It',
  'rating_no_ratings': 'No ratings yet',
  'ai_placeholder': 'Ask AI for recommendations...',
  'ai_ask': 'Ask',
  'booking_whatsapp_title': 'WHATSAPP BOOKING',
  'booking_request_title': 'AURA BOOKING REQUEST',
  'booking_your_name': 'Your Name',
  'booking_date': 'Booking Date',
  'booking_time': 'Preferred Time Slot',
  'booking_open_whatsapp': 'Open WhatsApp Chat',
  'booking_email': 'Your Email',
  'booking_category': 'Preferred Service Category',
  'booking_continue': 'Continue',
  'booking_back': 'Back',
  'booking_review': 'Review details',
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('aura_lang') || 'en');
  const [translations, setTranslations] = useState({}); // Shape: { [lang]: { [text]: translation } }
  const pendingRequests = useRef(new Set()); // Keys: `${lang}:${text}`

  const setLang = useCallback((code) => {
    setLangState(code);
    localStorage.setItem('aura_lang', code);
    document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr';
  }, []);

  // Async API Translation Orchestrator for dynamic database texts
  const translateText = useCallback(async (text, targetLang = lang) => {
    if (!text || targetLang === 'en') return text;
    
    // Check cache first
    if (translations[targetLang] && translations[targetLang][text]) {
      return translations[targetLang][text];
    }

    try {
      const res = await fetch(`${API}/api/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslations(prev => ({
          ...prev,
          [targetLang]: {
            ...(prev[targetLang] || {}),
            [text]: data.translatedText
          }
        }));
        return data.translatedText;
      }
      return text;
    } catch (err) {
      console.warn("AI Translation fallback:", err);
      return text;
    }
  }, [lang, translations]);

  // Synchronous translation hook that fetches missing translations in the background
  const t = useCallback((text) => {
    if (!text) return '';
    if (lang === 'en') {
      return ENGLISH_DICT[text] || text;
    }

    const langCache = translations[lang] || {};
    if (langCache[text]) {
      return langCache[text];
    }

    const englishText = ENGLISH_DICT[text] || text;
    const reqKey = `${lang}:${text}`;

    if (!pendingRequests.current.has(reqKey)) {
      pendingRequests.current.add(reqKey);

      fetch(`${API}/api/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText, targetLang: lang })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.translatedText) {
          setTranslations(prev => ({
            ...prev,
            [lang]: {
              ...(prev[lang] || {}),
              [text]: data.translatedText
            }
          }));
        }
      })
      .catch(err => {
        console.warn("Background translation failed for:", text, err);
      });
    }

    return englishText;
  }, [lang, translations]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}