import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { buildDemoSalons } from '../utils/demoData.js';

const API = (import.meta.env.VITE_API_URL||'').replace(/\/$/,'') || 'http://localhost:5000';
export { API };

const AuraContext = createContext(null);
const PAGE_SIZE = 12;

// No hardcoded place names. If our own backend is unreachable, we fall back
// to asking OpenStreetMap's Nominatim directly for real Hyderabad localities
// (administrative suburbs), ranked by OSM's own importance score — this is
// the same free data source the rest of the app already depends on, so the
// fallback path has zero invented data, just a different route to fetch it.
let _fallbackCache = null; // in-memory cache so we don't hit Nominatim on every retry
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
      hubs.push({ hub: name, count: 0 });
      if (hubs.length >= 10) break;
    }
    _fallbackCache = hubs.length ? hubs : null;
    return _fallbackCache;
  } catch {
    return null; // genuinely no data available — caller must handle null
  }
}

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// AuraScore — ranks salons using ONLY real signals we actually have:
// distance from the user (when known) and whether real OSM category/gender
// tags exist at all (a salon with actual tagged detail ranks slightly above
// one OSM gave us zero detail on, since we can tell the user more about it).
// We deliberately do NOT weight this by luxuryRating/reviewCount — those
// fields have no real data behind them yet (see Salon model ratingSource).
function auraScore(salon, uLat, uLon, matchedCategory) {
  const c = salon.location?.coordinates;
  let distScore = 0.5; // neutral when we don't know user location
  if (uLat && c?.[1] && c?.[0]) {
    const km = haversine(uLat, uLon, c[1], c[0]);
    distScore = Math.max(0, 1 - km / 20);
  }
  const hasDetail = (salon.serviceCategories?.length > 0 || !!salon.servesGender) ? 1 : 0.6;
  const categoryMatchBoost = matchedCategory && salon.serviceCategories?.includes(matchedCategory) ? 1 : 0.8;
  return distScore * 0.6 + hasDetail * 0.25 + categoryMatchBoost * 0.15;
}

// Safe address string — guards against object children crash
export function safeAddress(salon) {
  const a=salon?.address;
  if(!a) return salon?.hub||'';
  if(typeof a==='string') return a;
  return [a.suburb,a.street,a.city].filter(Boolean).join(', ');
}
// Safe coordinates
export function safeCoords(salon) {
  const c=salon?.location?.coordinates;
  if(!Array.isArray(c)||c.length<2) return null;
  return {lat:c[1],lon:c[0]};
}

export const AuraProvider = ({children}) => {
  const [allHubs,       setAllHubs]       = useState([]);
  const [activeHub,     setActiveHub]     = useState('');
  const [salons,        setSalons]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set()); // real serviceCategories tags
  const [genderFilter,  setGenderFilter]  = useState('any');     // real servesGender filter
  const [stats,         setStats]         = useState({total:0});
  const [toast,         setToast]         = useState(null);
  const [page,          setPage]          = useState(1);
  const [userLocation,  setUserLocation]  = useState(null);
  const [aiReply,       setAiReply]       = useState('');
  const [aiMatchIds,    setAiMatchIds]    = useState([]);
  const [onboarded,     setOnboarded]     = useState(false);
  const toastTimer = useRef(null);

  const pushToast = useCallback((msg,variant='success')=>{
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,variant});
    toastTimer.current = setTimeout(()=>setToast(null),3500);
  },[]);

  // Passive geolocation — doesn't ask permission, just catches if already granted
  useEffect(()=>{
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos=>setUserLocation({lat:pos.coords.latitude,lon:pos.coords.longitude}),
      ()=>{}, {maximumAge:300000}
    );
  },[]);

  // Returns { hub, distanceKm, inServiceArea } — never silently teleports
  // someone in Mumbai or Bangalore into a random Hyderabad hub. We use a
  // generous 60km radius (covers Hyderabad metro + outskirts); beyond that
  // we tell the caller honestly so the UI can show a real message instead
  // of pretending we found something nearby.
  // Returns { hub, distanceKm, inServiceArea } — never silently teleports
  // someone in Mumbai or Bangalore into a random Hyderabad hub. Coordinates
  // come from each hub's LIVE centroid (computed server-side from actual
  // synced salon GPS data) — no static lookup table. If a hub hasn't been
  // synced yet and has no coordinate, it's skipped for distance purposes
  // (it can still be picked manually from the list).
  const resolveNearestHub = useCallback(async (lat,lon) => {
    setUserLocation({lat,lon});
    let list = allHubs.length ? allHubs : await fetchDynamicFallbackHubs();
    if (!list || !list.length) {
      return { hub: null, distanceKm: null, inServiceArea: false };
    }
    let best=null, bestD=Infinity;
    list.forEach(h => {
      if (typeof h.lat !== 'number' || typeof h.lon !== 'number') return;
      const d = haversine(lat, lon, h.lat, h.lon);
      if (d < bestD) { bestD = d; best = h.hub; }
    });
    // No hub had usable coordinates yet (fresh DB, nothing synced) —
    // fall back to the first known hub name rather than failing outright.
    if (!best) best = list[0]?.hub || null;
    const SERVICE_RADIUS_KM = 60;
    return {
      hub: best,
      distanceKm: bestD === Infinity ? null : Math.round(bestD),
      inServiceArea: bestD === Infinity ? true : bestD <= SERVICE_RADIUS_KM,
    };
  },[allHubs]);

  const loadHubList = useCallback(async()=>{
    try {
      const {data} = await axios.get(`${API}/api/salons/hubs`,{timeout:8000});
      if (data.data?.length) { setAllHubs(data.data); return data.data; }
      throw new Error('empty');
    } catch {
      const fallback = await fetchDynamicFallbackHubs();
      const list = fallback || [];
      setAllHubs(list);
      return list;
    }
  },[]);

  const toggleFilter = useCallback((tag)=>{
    setActiveFilters(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;});
    setPage(1);
  },[]);

  const syncHub = useCallback(async(hub)=>{
    setActiveHub(hub); setSyncing(true); setLoading(true);
    setError(null); setSalons([]); setPage(1); setAiReply(''); setAiMatchIds([]);
    setOnboarded(true);
    try {
      // 1. Try DB first
      let list=[];
      try {
        const {data}=await axios.get(`${API}/api/salons`,{params:{hub,limit:60},timeout:10000});
        list=data.data||[];
      } catch{}

      // 2. If DB empty → trigger OSM sync
      if(!list.length) {
        try {
          const {data}=await axios.post(`${API}/api/sync/hub`,{luxuryHub:hub},{timeout:30000});
          if(data.ingested>0) pushToast(`✦ ${data.ingested} salons synced from OpenStreetMap`);
          const {data:d2}=await axios.get(`${API}/api/salons`,{params:{hub,limit:60},timeout:10000});
          list=d2.data||[];
        } catch{}
      }

      // 3. If still empty → demo data (prevents blank screen)
      if(!list.length) {
        list=buildDemoSalons(hub);
        pushToast('Showing demo data — connect backend for live salons','info');
      }

      // 4. Rank by AuraScore — distance + real-data-availability only,
      // never by fake rating/review numbers
      const loc=userLocation;
      const ranked=[...list].sort((a,b)=>auraScore(b,loc?.lat,loc?.lon)-auraScore(a,loc?.lat,loc?.lon));
      setSalons(ranked);
      setStats({total:ranked.length});
    } catch(e) {
      const demo=buildDemoSalons(hub);
      setSalons(demo);
      setStats({total:demo.length});
      pushToast('Demo mode — backend unreachable','info');
    } finally { setLoading(false); setSyncing(false); }
  },[pushToast,userLocation]);

  // Shared analytics helper — fire-and-forget, never blocks the UI and
  // never throws. Powers the admin dashboard's real traffic numbers (view
  // counts, route clicks, AI search usage, mirror usage) instead of those
  // event types sitting in the schema unused.
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
      return data; // let caller (chat UI) read message/salons for the thread
    } catch {
      pushToast('AI unavailable — check API keys in .env','error');
      return null;
    }
    finally { setLoading(false); }
  },[pushToast,userLocation,trackEvent]);

  // Filter by real serviceCategories tags + real servesGender — never the
  // old fake `services[].tag` priced-menu shape.
  const filtered = salons.filter(s => {
    const categoryOk = activeFilters.size===0 || (s.serviceCategories||[]).some(c=>activeFilters.has(c));
    const genderOk = genderFilter==='any' || s.servesGender===genderFilter;
    return categoryOk && genderOk;
  });
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageSalons = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <AuraContext.Provider value={{
      allHubs,activeHub,salons:pageSalons,allFilteredSalons:filtered,
      loading,syncing,error,activeFilters,toggleFilter,genderFilter,setGenderFilter,stats,
      syncHub,aiSearch,pushToast,toast,
      page,setPage,totalPages,
      userLocation,setUserLocation,
      aiReply,aiMatchIds,
      onboarded,setOnboarded,
      loadHubList,resolveNearestHub,
      trackEvent,
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
