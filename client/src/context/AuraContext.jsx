import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { buildDemoSalons } from '../utils/demoData.js';

const API = (import.meta.env.VITE_API_URL||'').replace(/\/$/,'') || 'http://localhost:5000';
export { API };

const AuraContext = createContext(null);
const PAGE_SIZE = 12;

let _fallbackCache = null; 
async function fetchDynamicFallbackHubs() {
  if (_fallbackCache) return _fallbackCache;
  try {
    const r = await fetch(
      'https://nominatim.openstreetmap.org/search?city=Hyderabad&state=Telangana&country=India&format=json&addressdetails=1&extratags=1&limit=40&featureType=settlement',
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await r.json();
    const seen = new Set();
    const hubs = [];
    for (const place of data || []) {
      const name = place.address?.suburb || place.address?.neighbourhood || place.address?.city_district || (place.display_name || '').split(',')[0];
      if (!name || seen.has(name)) continue;
      seen.add(name);
      // Explicitly parse coordinates to avoid math execution breakdown blocks
      hubs.push({ 
        hub: name, 
        count: 0, 
        lat: parseFloat(place.lat) || 17.3850, 
        lon: parseFloat(place.lon) || 78.4867 
      });
      if (hubs.length >= 10) break;
    }
    _fallbackCache = hubs.length ? hubs : null;
    return _fallbackCache;
  } catch {
    return null; 
  }
}

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function auraScore(salon, uLat, uLon, matchedCategory) {
  const c = salon.location?.coordinates;
  let distScore = 0.5; 
  if (uLat && c?.[1] && c?.[0]) {
    const km = haversine(uLat, uLon, c[1], c[0]);
    distScore = Math.max(0, 1 - km / 20);
  }
  const hasDetail = (salon.serviceCategories?.length > 0 || !!salon.servesGender) ? 1 : 0.6;
  const categoryMatchBoost = matchedCategory && salon.serviceCategories?.includes(matchedCategory) ? 1 : 0.8;
  return distScore * 0.6 + hasDetail * 0.25 + categoryMatchBoost * 0.15;
}

export function safeAddress(salon) {
  const formatSlug = (str) => {
    if (!str) return '';
    return str.replace(/\./g, ', ').replace(/\b\w/g, c => c.toUpperCase());
  };
  const a=salon?.address;
  if(!a) return formatSlug(salon?.hub);
  if(typeof a==='string') return formatSlug(a);
  return [a.suburb,a.street,a.city].filter(Boolean).join(', ');
}

export function safeCoords(salon) {
  const c=salon?.location?.coordinates;
  if(!Array.isArray(c)||c.length<2) return null;
  return {lat:c[1],lon:c[0]};
}

export const AuraProvider = ({children}) => {
  const [allHubs,        setAllHubs]        = useState([]);
  const [activeHub,      setActiveHub]      = useState('');
  const [activeCategory, setActiveCategory] = useState(null);  // ← was missing, caused black screen
  const [salons,         setSalons]         = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [syncing,        setSyncing]        = useState(false);
  const [error,          setError]          = useState(null);
  const [activeFilters,  setActiveFilters]  = useState(new Set());
  const [genderFilter,   setGenderFilter]   = useState('any');
  const [stats,          setStats]          = useState({total:0});
  const [toast,          setToast]          = useState(null);
  const [page,           setPage]           = useState(1);
  const [userLocation,   setUserLocation]   = useState(null);
  const [aiReply,        setAiReply]        = useState('');
  const [aiMatchIds,     setAiMatchIds]     = useState([]);
  const [onboarded,      setOnboarded]      = useState(false);
  const toastTimer = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('aura_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }); 
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const login = (userData, token) => {
    if (token) localStorage.setItem('aura_token', token);
    if (userData) {
      localStorage.setItem('aura_user', JSON.stringify(userData));
      setUser(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    setUser(null);
  };

  const pushToast = useCallback((msg,variant='success')=>{
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,variant});
    toastTimer.current = setTimeout(()=>setToast(null),3500);
  },[]);

  useEffect(()=>{
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos=>setUserLocation({lat:pos.coords.latitude,lon:pos.coords.longitude}),
      ()=>{}, {maximumAge:300000}
    );
  },[]);

  const resolveNearestHub = useCallback(async (lat,lon) => {
    setUserLocation({lat,lon});
    let list = allHubs.length ? allHubs : await fetchDynamicFallbackHubs();
    if (!list || !list.length) {
      return { hub: null, distanceKm: null, inServiceArea: false };
    }
    let best=null, bestD=Infinity;
    list.forEach(h => {
      if (!h || typeof h.lat !== 'number' || typeof h.lon !== 'number') return;
      const d = haversine(lat, lon, h.lat, h.lon);
      if (d < bestD) { bestD = d; best = h.hub; }
    });
    if (!best) best = list[0]?.hub || null;
    const SERVICE_RADIUS_KM = 60;
    return {
      hub: best,
      distanceKm: bestD === Infinity ? null : Math.round(bestD),
      inServiceArea: bestD === Infinity ? true : bestD <= SERVICE_RADIUS_KM,
    };
  },[allHubs]);

  const loadHubList = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/salons/hubs`, { timeout: 8000 });
      // Controller returns { success, data: [{hub, count, lat, lon}] }
      const rawList = data.data || data.hubs || [];
      const list = Array.isArray(rawList) ? rawList : [];
      if (list.length) {
        const mapped = list.map(h => ({
          hub:   typeof h === 'string' ? h : (h.hub || ''),
          count: h.count  || 0,
          lat:   parseFloat(h.lat)  || 17.3850,
          lon:   parseFloat(h.lon)  || 78.4867,
        })).filter(h => h.hub);
        setAllHubs(mapped);
        return mapped;
      }
      throw new Error('empty');
    } catch {
      // Fallback: read VITE env hubs so the app isn't dead without a DB
      const envHubs = (import.meta.env.VITE_ACTIVE_HUBS || '').split(',').map(h => h.trim()).filter(Boolean);
      const osmFallback = await fetchDynamicFallbackHubs();
      const list = envHubs.length
        ? envHubs.map(hub => ({ hub, count: 0, lat: 17.3850, lon: 78.4867 }))
        : (osmFallback || []);
      setAllHubs(list);
      return list;
    }
  }, []);

  // Self-trigger fallback lists hydration immediately upon mount configuration parameters
  useEffect(() => {
    loadHubList();
  }, [loadHubList]);

  const toggleFilter = useCallback((tag)=>{
    setActiveFilters(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;});
    setPage(1);
  },[]);

  const clearFilters = useCallback(()=>{
    setActiveFilters(new Set());
    setPage(1);
  },[]);

  const appendHub = useCallback((newHub)=>{
    setAllHubs(prev=>{
      const exists = prev.some(h=>(typeof h==='string'?h:h.hub)===newHub.hub);
      if(exists) return prev;
      return [...prev, newHub];
    });
  },[]);

  const syncHub = useCallback(async(hub)=>{
    setActiveHub(hub); setSyncing(true); setLoading(true);
    setError(null); setSalons([]); setPage(1); setAiReply(''); setAiMatchIds([]);
    setOnboarded(true);

    // Anchor distance calculations to the selected hub center instead of physical GPS
    const hubData = allHubs.find(h => (typeof h === 'string' ? h : h.hub) === hub);
    const loc = (hubData && hubData.lat && hubData.lon) 
      ? { lat: hubData.lat, lon: hubData.lon, isHubAnchor: true, hubName: hub }
      : userLocation;
    
    if (hubData && hubData.lat && hubData.lon) {
      setUserLocation(loc);
    }
    try {
      let list=[];
      try {
        const {data}=await axios.get(`${API}/api/salons`,{params:{hub,limit:60},timeout:10000});
        list=data.data||[];
      } catch{}

      if(!list.length) {
        try {
          const {data}=await axios.post(`${API}/api/sync/hub`,{luxuryHub:hub},{timeout:30000});
          if(data.ingested>0) pushToast(`✦ ${data.ingested} salons synced from OpenStreetMap`);
          const {data:d2}=await axios.get(`${API}/api/salons`,{params:{hub,limit:60},timeout:10000});
          list=d2.data||[];
        } catch{}
      }

      if(!list.length) {
        list=buildDemoSalons(hub);
        pushToast('Showing sample data — connect backend for live salons','info');
      }

      const ranked=[...list].sort((a,b)=>auraScore(b,loc?.lat,loc?.lon)-auraScore(a,loc?.lat,loc?.lon));
      setSalons(ranked);
      setStats({total:ranked.length});
    } catch(e) {
      const demo=buildDemoSalons(hub);
      setSalons(demo);
      setStats({total:demo.length});
      pushToast('Offline mode — backend unreachable','info');
    } finally { setLoading(false); setSyncing(false); }
  },[pushToast,userLocation]);

  const trackEvent = useCallback((event, payload = {}) => {
    axios.post(`${API}/api/bookings/track`, { event, ...payload }, { timeout: 5000 }).catch(() => {});
  }, []);

  const aiSearch = useCallback(async(query, history)=>{
    setLoading(true); setAiReply(''); setAiMatchIds([]);
    trackEvent('ai_search', { metadata: { query: query.slice(0, 200) } });
    try {
      const {data}=await axios.post(`${API}/api/chat/query`,{
        message: query,
        history: history || [],
        userLocation: userLocation || undefined,
      },{timeout:20000});
      const list=Array.isArray(data.salons)?data.salons:[];
      setSalons(list);
      setAiReply(data.aiProvider ? `${data.message||''} · powered by ${data.aiProvider}` : (data.message||''));
      setAiMatchIds(list.map(s=>s._id).filter(Boolean));
      setPage(1);
      if(data.searchParams?.hub) setActiveHub(data.searchParams.hub);
      return data;
    } catch {
      pushToast('AI unavailable — check API keys in .env','error');
      return null;
    }
    finally { setLoading(false); }
  },[pushToast,userLocation,trackEvent]);

  const filtered = salons.filter(s => {
    const categoryOk = activeFilters.size===0 || (s.serviceCategories||[]).some(c=>activeFilters.has(c));
    const genderOk = genderFilter==='any' || s.servesGender===genderFilter;
    return categoryOk && genderOk;
  });
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageSalons = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <AuraContext.Provider value={{
      allHubs, activeHub, activeCategory, setActiveCategory,
      salons: pageSalons, allFilteredSalons: filtered,
      loading, syncing, error, activeFilters, toggleFilter, clearFilters, genderFilter, setGenderFilter, stats,
      syncHub, appendHub, aiSearch, pushToast, toast,
      page, setPage, totalPages,
      userLocation, setUserLocation,
      aiReply, aiMatchIds,
      onboarded, setOnboarded,
      loadHubList, resolveNearestHub,
      trackEvent,
      user, setUser, authModalOpen, setAuthModalOpen, login, logout
    }}>
      {children}
    </AuraContext.Provider>
  );
};

export const useAura = ()=>{
  const ctx = useContext(AuraContext);
  if(!ctx) throw new Error('useAura must be inside AuraProvider');
  return ctx;
};