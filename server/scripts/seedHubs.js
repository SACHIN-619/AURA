import 'dotenv/config';
import axios from 'axios';
const BASE = `http://localhost:${process.env.PORT||5000}`;
const HUBS = ['Jubilee Hills','Banjara Hills','Hitech City','Gachibowli','Madhapur','Kondapur','Kukatpally','Ameerpet'];
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let total = 0;
console.log('🚀 Seeding Hyderabad hubs...\n');
for(const hub of HUBS) {
  try {
    console.log(`⏳ ${hub}...`);
    const {data} = await axios.post(`${BASE}/api/sync/hub`,{luxuryHub:hub},{headers:{'Content-Type':'application/json'}});
    total += data.ingested||0;
    console.log(`  ✅ ${data.ingested||0} salons (${data.breakdown?.newRecords||0} new)\n`);
  } catch(e) { console.error(`  ❌ ${hub}: ${e.response?.data?.error||e.message}\n`); }
  await sleep(1300); // Nominatim rate limit: 1 req/sec
}
console.log(`🎉 Done! Total: ${total} salons`);
process.exit(0);
