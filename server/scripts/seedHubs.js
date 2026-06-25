// scripts/seedHubs.js
import 'dotenv/config';
import axios from 'axios';

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ZERO HARDCODING: Extract hubs dynamically from your environment variables or process flags
const HUBS_ENV = process.env.ACTIVE_MARKETPLACE_HUBS;
const HUBS = HUBS_ENV ? HUBS_ENV.split(',').map(h => h.trim()) : [];

async function run() {
  if (HUBS.length === 0) {
    console.error('❌ Error: No hubs provided. Please configure ACTIVE_MARKETPLACE_HUBS in your .env file.');
    process.exit(1);
  }

  let total = 0;
  console.log(`🚀 Seeding target marketplace hubs for context: [ ${HUBS.join(', ')} ]\n`);

  for (const hub of HUBS) {
    try {
      console.log(`⏳ Synchronizing location nodes for: ${hub}...`);
      
      const { data } = await axios.post(
        `${BASE}/api/sync/hub`,
        { luxuryHub: hub },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      total += data.ingested || 0;
      console.log(`  ✅ ${data.ingested || 0} salons (${data.breakdown?.newRecords || 0} new)\n`);
    } catch (e) { 
      console.error(`  ❌ Failed node synchronization for ${hub}: ${e.response?.data?.error || e.message}\n`); 
    }
    
    await sleep(1300); // Respect Nominatim OpenStreetMap rate limits (1 req / sec)
  }

  console.log(`🎉 Operation Finished! Total ingested across cluster: ${total} salons.`);
  process.exit(0);
}

run();