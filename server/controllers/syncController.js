import axios from 'axios';
import Salon from '../models/Salon.js';
import { OSM_BEAUTY_TAG_MAP } from '../utils/constants.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS  = 'https://overpass-api.de/api/interpreter';

const http = () => axios.create({ timeout:20000, headers:{
  'User-Agent': process.env.APP_USER_AGENT || 'AuraMarketplace/1.0',
  'Accept':'application/json'
}});

// Parses OSM's `beauty=hairdresser;nails;massage` style tag into our
// canonical category list. Returns [] if OSM had no such tag — we do NOT
// invent categories for salons OSM gave us no detail on.
function extractServiceCategories(tags) {
  const raw = tags.beauty;
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(';')
    .map(v => v.trim().toLowerCase())
    .map(v => OSM_BEAUTY_TAG_MAP[v])
    .filter(Boolean);
}

// Reads OSM's actual unisex/male/female tags — returns null if untagged,
// never guesses.
function extractServesGender(tags) {
  if (tags.unisex === 'yes') return 'unisex';
  if (tags.male === 'yes' && tags.female !== 'yes') return 'male';
  if (tags.female === 'yes' && tags.male !== 'yes') return 'female';
  if (tags.male === 'yes' && tags.female === 'yes') return 'unisex';
  return null;
}

// Ola Maps (Krutrim Cloud) geocoding — used ONLY as a fallback when
// Nominatim fails to resolve an area name. Free tier, generous limits for
// Indian developers. Returns the same {s,n,w,e} bbox shape as the primary
// path so callers don't need to know which provider actually answered.
async function geocodeViaOlaMaps(hub, cl) {
  if (!process.env.OLA_MAPS_API_KEY) return null;
  try {
    const { data } = await cl.get('https://api.olamaps.io/places/v1/geocode', {
      params: { address: `${hub}, Hyderabad, Telangana, India`, api_key: process.env.OLA_MAPS_API_KEY },
    });
    const hit = data?.geocodingResults?.[0];
    if (!hit?.geometry?.location) return null;
    const { lat, lng } = hit.geometry.location;
    // Ola returns a point, not a bbox — synthesize a small bounding box
    // around it (~2km) so downstream Overpass query logic is unchanged.
    const delta = 0.018;
    return { s: lat - delta, n: lat + delta, w: lng - delta, e: lng + delta };
  } catch (e) {
    console.warn('[Geocode:OlaMaps]', e.message);
    return null;
  }
}

export const syncHub = async (req,res) => {
  const { luxuryHub } = req.body;
  if(!luxuryHub||typeof luxuryHub!=='string'||luxuryHub.trim().length<2)
    return res.status(400).json({success:false,error:'Invalid hub name'});
  const hub = luxuryHub.trim();
  const t0  = Date.now();
  const cl  = http();

  // Step 1: Geocode — Nominatim primary, Ola Maps fallback if it fails
  // or returns nothing usable. This is exactly the kind of 2-fallback
  // resilience needed for a critical path (no bbox = no salons found).
  let bbox;
  try {
    const {data} = await cl.get(NOMINATIM,{params:{q:`${hub}, Hyderabad`,format:'json',bounded:1,limit:5}});
    const hit = data.find(r=>r.boundingbox?.length===4);
    if (hit) {
      const [s,n,w,e] = hit.boundingbox.map(Number);
      bbox = {s,n,w,e};
    }
  } catch(e) { console.warn('[Geocode:Nominatim]', e.message); }

  if (!bbox) {
    bbox = await geocodeViaOlaMaps(hub, cl);
  }

  if (!bbox) {
    return res.status(422).json({success:false,error:`Cannot geocode "${hub}" — both Nominatim and Ola Maps fallback failed or returned nothing`});
  }

  // Step 2: Overpass
  let nodes=[];
  try {
    const ql = `[out:json][timeout:25];(node["shop"="beauty"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["shop"="hairdresser"](${bbox.s},${bbox.w},${bbox.n},${bbox.e}););out body;`;
    const {data} = await cl.post(OVERPASS,`data=${encodeURIComponent(ql)}`,{headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    nodes = data?.elements||[];
  } catch(e) { return res.status(502).json({success:false,error:`Overpass failed: ${e.message}`}); }

  if(!nodes.length) return res.json({success:true,hub,ingested:0,message:`No OSM nodes found for "${hub}"`,durationMs:Date.now()-t0});

  // Step 3: Upsert — using ONLY real OSM tag data. No fabricated services,
  // no fabricated prices. luxuryRating/reviewCount stay null + flagged
  // synthetic until a real review data source is integrated.
  let inserted=0,updated=0,failed=0;
  await Promise.all(nodes.map(async node=>{
    try {
      const tags = node.tags||{};
      const payload = {
        osmId:String(node.id), name:tags.name||`Salon ${node.id}`, hub,
        location:{type:'Point',coordinates:[node.lon,node.lat]},
        address:{street:tags['addr:street'],suburb:tags['addr:suburb']||tags['addr:quarter'],city:'Hyderabad',postcode:tags['addr:postcode'],state:'Telangana'},
        contact:{phone:tags.phone,website:tags.website,email:tags.email},
        openingHours:tags.opening_hours,
        serviceCategories: extractServiceCategories(tags),
        servesGender: extractServesGender(tags),
        ratingSource: 'synthetic_placeholder',
        tier: 'unrated',
        lastSyncedAt:new Date(),
      };
      const r = await Salon.findOneAndUpdate({osmId:payload.osmId},{$set:payload},{upsert:true,new:true,runValidators:true});
      r.createdAt.getTime()===r.updatedAt.getTime() ? inserted++ : updated++;
    } catch { failed++; }
  }));

  return res.json({success:true,hub,rawNodesFound:nodes.length,ingested:inserted+updated,
    breakdown:{newRecords:inserted,updatedRecords:updated,failedRecords:failed},durationMs:Date.now()-t0,
    message:`Synced ${inserted+updated} salons for "${hub}" — real OSM data only, no fabricated services/pricing`});
};

export const syncStatus = async (req,res) => {
  try {
    const [total,hubs] = await Promise.all([
      Salon.countDocuments(),
      Salon.aggregate([{$group:{_id:'$hub',count:{$sum:1},lastSync:{$max:'$lastSyncedAt'}}},{$sort:{count:-1}}]),
    ]);
    return res.json({success:true,totalSalons:total,hubs});
  } catch(e) { return res.status(500).json({success:false,error:e.message}); }
};
