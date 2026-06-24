import { strict as assert } from 'assert';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname,'../..');
let p=0,f=0;
const test = (n,fn) => { try{fn();console.log(`  ✅  ${n}`);p++;}catch(e){console.log(`  ❌  ${n}\n     ${e.message}`);f++;} };
const testAsync = async (n,fn) => { try{await fn();console.log(`  ✅  ${n}`);p++;}catch(e){console.log(`  ❌  ${n}\n     ${e.message}`);f++;} };

console.log('\n══════════════════════════════════════');
console.log('  AURA — Backend Smoke Tests');
console.log('══════════════════════════════════════\n');

const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
test('type:module',              () => assert.equal(pkg.type,'module'));
test('No @anthropic-ai/sdk',     () => assert.ok(!pkg.dependencies['@anthropic-ai/sdk']));
test('@google/generative-ai',    () => assert.ok(pkg.dependencies['@google/generative-ai']));
test('groq-sdk',                 () => assert.ok(pkg.dependencies['groq-sdk']));
test('@huggingface/inference',   () => assert.ok(pkg.dependencies['@huggingface/inference']));

const files = ['server/index.js','server/config/database.js','server/models/Salon.js','server/services/aiService.js',
  'server/controllers/aiController.js','server/controllers/syncController.js','server/controllers/salonController.js',
  'server/controllers/bookingController.js','server/controllers/userController.js','server/controllers/searchController.js',
  'server/controllers/mirrorController.js','server/controllers/ratingController.js','server/controllers/authController.js','server/controllers/adminController.js','server/routes/syncRoutes.js','server/routes/salonRoutes.js',
  'server/routes/aiRoutes.js','server/routes/bookingRoutes.js','server/routes/userRoutes.js',
  'server/routes/searchRoutes.js','server/routes/mirrorRoutes.js','server/routes/ratingRoutes.js','server/routes/authRoutes.js','server/routes/adminRoutes.js','server/utils/xp.js','server/services/uploadService.js','server/scripts/seedHubs.js'];

for(const f2 of files) {
  const src = readFileSync(join(root,f2),'utf8');
  test(`${f2} — no require()`,      () => assert.ok(!src.match(/\brequire\s*\(/)));
  test(`${f2} — no module.exports`, () => assert.ok(!src.includes('module.exports')));
}

test('No fabricated service pricing — uses real OSM tag extraction', () => {
  const src = readFileSync(join(root,'server/utils/constants.js'),'utf8');
  assert.ok(!src.includes('LUXURY_SERVICES'), 'Fixed fake service+price list should not exist');
  assert.ok(src.includes('OSM_BEAUTY_TAG_MAP'), 'Should map real OSM beauty tags instead');
});
test('No synthetic Math.random() ratings presented as real', () => {
  const src = readFileSync(join(root,'server/models/Salon.js'),'utf8');
  assert.ok(!src.includes('default: () => Math.random'), 'Salon model must not auto-generate fake ratings/review counts via schema default');
  assert.ok(src.includes('ratingSource'), 'Must flag whether rating data is real or placeholder');
});
test('No hardcoded salon names in controllers', () => {
  const forbidden = ['Nizami Luxe Studio','The Grooming Atelier','Velvet & Gold'];
  for(const f2 of files) {
    const src = readFileSync(join(root,f2),'utf8');
    for(const n of forbidden) assert.ok(!src.includes(n),`Found "${n}" in ${f2}`);
  }
});
test('CORS uses env in production', () => {
  const src = readFileSync(join(root,'server/index.js'),'utf8');
  assert.ok(src.includes('CLIENT_ORIGIN'));
});
test('dotenv/config first import', () => {
  const src = readFileSync(join(root,'server/index.js'),'utf8');
  assert.ok(src.startsWith("import 'dotenv/config'"));
});
test('import.meta.url for __dirname', () => {
  const src = readFileSync(join(root,'server/index.js'),'utf8');
  assert.ok(src.includes('import.meta.url'));
});

await testAsync('aiService imports', async () => {
  const m = await import('../services/aiService.js');
  assert.ok(typeof m.generateStructuredJSON === 'function');
});
await testAsync('salonController imports', async () => {
  const m = await import('../controllers/salonController.js');
  assert.ok(typeof m.getSalons === 'function');
  assert.ok(typeof m.getHubs === 'function');
});
await testAsync('bookingController imports', async () => {
  const m = await import('../controllers/bookingController.js');
  assert.ok(typeof m.createBooking === 'function');
});
await testAsync('searchController imports', async () => {
  const m = await import('../controllers/searchController.js');
  assert.ok(typeof m.autocomplete === 'function');
});
await testAsync('mirrorController imports', async () => {
  const m = await import('../controllers/mirrorController.js');
  assert.ok(typeof m.analyzeImage === 'function');
});
await testAsync('ratingController imports', async () => {
  const m = await import('../controllers/ratingController.js');
  assert.ok(typeof m.submitRating === 'function');
  assert.ok(typeof m.getSalonRatings === 'function');
  assert.ok(typeof m.checkRatingEligibility === 'function');
  assert.ok(typeof m.moderateRating === 'function');
});
test('Profile and account deletion require real auth, not a guessable email param', () => {
  const routes = readFileSync(join(root,'server/routes/userRoutes.js'),'utf8');
  assert.ok(routes.includes("requireAuth, getProfile") || routes.match(/requireAuth,\s*getProfile/), 'GET /profile must require auth');
  assert.ok(routes.includes("requireAuth, deleteUser") || routes.match(/requireAuth,\s*deleteUser/), 'DELETE / must require auth');
  const ctrl = readFileSync(join(root,'server/controllers/userController.js'),'utf8');
  assert.ok(!ctrl.match(/getProfile[\s\S]*?req\.query\.email/), 'getProfile must use req.user.email from JWT, not a client-supplied query param');
  assert.ok(!ctrl.match(/export const deleteUser[\s\S]*?req\.body[\s\S]*?email/), 'deleteUser must use req.user.email from JWT, not a client-supplied body field');
});
test('Insecure unauthenticated booking-lookup endpoint stays removed', () => {
  const routes = readFileSync(join(root,'server/routes/bookingRoutes.js'),'utf8');
  assert.ok(!routes.match(/router\.get\(['"]\/mine['"]/), "GET /mine (keyed by an unauthenticated email query param) must not be reintroduced as an actual route — use the JWT-protected /api/users/profile instead");
  const ctrl = readFileSync(join(root,'server/controllers/bookingController.js'),'utf8');
  assert.ok(!ctrl.match(/export const getMyBookings\s*=/), 'getMyBookings function must not be reintroduced in the controller');
});
await testAsync('adminController exposes real analytics endpoint', async () => {
  const m = await import('../controllers/adminController.js');
  assert.ok(typeof m.getAnalytics === 'function');
});
await testAsync('adminController exposes listing verification endpoints', async () => {
  const m = await import('../controllers/adminController.js');
  assert.ok(typeof m.verifyListing === 'function');
  assert.ok(typeof m.getUnverifiedListings === 'function');
});
test('Listing verification audit trail comes from JWT, never request body', () => {
  const src = readFileSync(join(root,'server/controllers/adminController.js'),'utf8');
  const fnMatch = src.match(/export const verifyListing[\s\S]*?^};/m);
  assert.ok(fnMatch, 'verifyListing function not found');
  const body = fnMatch[0];
  assert.ok(body.includes('req.user.sub'), 'verifier identity must come from the verified JWT (req.user.sub)');
  assert.ok(!body.includes('req.body.listingVerifiedBy') && !body.includes('req.body.adminId'), 'verifier identity must never be trusted from request body');
});
test('Listing verification is distinct from rating verification', () => {
  const salonModel = readFileSync(join(root,'server/models/Salon.js'),'utf8');
  const ratingModel = readFileSync(join(root,'server/models/Rating.js'),'utf8');
  assert.ok(salonModel.includes('listingVerified'), 'Salon model must have its own listingVerified field');
  assert.ok(ratingModel.includes('isVerified'), 'Rating model must keep its own separate isVerified field');
});
await testAsync('aiService exports Krutrim as 4th cascade provider', async () => {
  const m = await import('../services/aiService.js');
  assert.ok(typeof m.generateStructuredJSON === 'function');
  const src = readFileSync(join(root,'server/services/aiService.js'),'utf8');
  assert.ok(src.includes('Krutrim'), 'Krutrim must be present as a fallback provider');
  assert.ok(src.includes('KRUTRIM_API_KEY'), 'Must read its key from env, never hardcoded');
});
test('Ola Maps geocoding fallback never fabricates a bounding box', () => {
  const src = readFileSync(join(root,'server/controllers/syncController.js'),'utf8');
  assert.ok(src.includes('geocodeViaOlaMaps'), 'Ola Maps fallback function must exist');
  assert.ok(src.includes('OLA_MAPS_API_KEY'), 'Must check for the real API key before attempting a call');
  const fnMatch = src.match(/async function geocodeViaOlaMaps[\s\S]*?^}/m);
  assert.ok(fnMatch, 'geocodeViaOlaMaps function not found');
  assert.ok(!fnMatch[0].match(/return\s*{\s*s:\s*0/), 'Must return null on failure, never a fake zeroed bbox');
});
await testAsync('xp utility imports', async () => {
  const m = await import('../utils/xp.js');
  assert.ok(typeof m.awardXp === 'function');
  assert.ok(typeof m.levelForXp === 'function');
  assert.ok(typeof m.xpToNextLevel === 'function');
  assert.ok(typeof m.XP_TABLE === 'object');
});
test('XP table has no entry for unverifiable real-world claims', () => {
  const src = readFileSync(join(root,'server/utils/xp.js'),'utf8');
  // The whole point: no "haircut_confirmed" or similar self-reported action
  // with zero server-side evidence should ever earn XP.
  assert.ok(!src.match(/haircut_(done|confirmed|completed)/i), 'No XP action should reward an unverifiable self-reported claim');
  assert.ok(src.includes('rating_verified_bonus'), 'Verified-rating bonus must exist — closest honest proxy for a real visit');
});
test('XP awarding requires server-confirmed actions, never client-claimed totals', () => {
  const ratingCtrl = readFileSync(join(root,'server/controllers/ratingController.js'),'utf8');
  assert.ok(!ratingCtrl.includes('req.body.xp') && !ratingCtrl.includes('req.body.xpAwarded'), 'XP amount must never be read from client request body');
  const authCtrl = readFileSync(join(root,'server/controllers/authController.js'),'utf8');
  assert.ok(!authCtrl.includes('req.body.xp'), 'Signup must never accept a client-supplied xp value');
});
test('First-AI-search XP uses an atomic one-time flag, not a client claim', () => {
  const src = readFileSync(join(root,'server/controllers/aiController.js'),'utf8');
  assert.ok(src.includes('hasUsedAiSearch'), 'Must check/set the server-side one-time flag');
  assert.ok(src.includes("{ \$ne: true }") || src.includes("hasUsedAiSearch: { \$ne: true }"), 'Flag check must be atomic (findOneAndUpdate with $ne guard) to prevent double-award from concurrent requests');
});
await testAsync('changePassword and avatar endpoints import correctly', async () => {
  const m = await import('../controllers/authController.js');
  assert.ok(typeof m.changePassword === 'function');
  assert.ok(typeof m.updateAvatar === 'function');
  assert.ok(typeof m.removeAvatar === 'function');
});
test('changePassword requires verifying the CURRENT password, never a bare overwrite', () => {
  const fnMatch = readFileSync(join(root,'server/controllers/authController.js'),'utf8').match(/export const changePassword[\s\S]*?^};/m);
  assert.ok(fnMatch, 'changePassword function not found');
  const body = fnMatch[0];
  assert.ok(body.includes('checkPassword'), 'Must verify the current password before allowing a change');
  assert.ok(body.includes('req.user.sub'), 'Must use identity from the JWT, never a client-supplied user ID');
});
test('Avatar upload has an honest unconfigured-service fallback, no fake base64-in-Mongo workaround', () => {
  const src = readFileSync(join(root,'server/services/uploadService.js'),'utf8');
  assert.ok(src.includes('isUploadConfigured'), 'Must expose a way to check if Cloudinary is actually configured');
  const ctrl = readFileSync(join(root,'server/controllers/authController.js'),'utf8');
  const fnMatch = ctrl.match(/export const updateAvatar[\s\S]*?^};/m);
  assert.ok(fnMatch && fnMatch[0].includes('isUploadConfigured'), 'updateAvatar must check configuration before attempting upload, and fail clearly if not configured');
});
test('Analytics conversion rate is null when no data, never fabricated', () => {
  const src = readFileSync(join(root,'server/controllers/adminController.js'),'utf8');
  assert.ok(src.includes('views > 0 ? Math.round'), 'conversionRate must be computed only when real view data exists');
  assert.ok(src.match(/:\s*null/), 'conversionRate must fall back to null, not a fabricated default like 0 or 4.5');
});
test('ImageCache dead model fully removed, not left half-wired', () => {
  assert.ok(!existsSync(join(root,'server/models/ImageCache.js')), 'ImageCache.js should be deleted — it was never used by any controller or route');
});
await testAsync('authController imports', async () => {
  const m = await import('../controllers/authController.js');
  assert.ok(typeof m.signup === 'function');
  assert.ok(typeof m.login === 'function');
  assert.ok(typeof m.getMe === 'function');
  assert.ok(typeof m.requireAuth === 'function');
  assert.ok(typeof m.requireAdmin === 'function');
});
test('Signup can never set role from client input', () => {
  const src = readFileSync(join(root,'server/controllers/authController.js'),'utf8');
  // Pull out just the signup function body
  const signupMatch = src.match(/export const signup[\s\S]*?^};/m);
  assert.ok(signupMatch, 'signup function not found');
  const body = signupMatch[0];
  assert.ok(!body.includes('req.body.role'), 'signup must never read role from request body');
  assert.ok(!body.match(/role:\s*req\.body/), 'signup must never assign role from request body');
  assert.ok(body.includes("role: 'user'") || body.includes('role:\'user\''), 'signup must hardcode role to user');
});
test('Admin role can only be granted via direct DB edit, never via API', () => {
  const userModel = readFileSync(join(root,'server/models/User.js'),'utf8');
  assert.ok(userModel.includes("enum: ['user', 'admin']"), 'role must be constrained to user/admin enum');
  // No controller should expose a route that lets a client PATCH their own role
  const userCtrl = readFileSync(join(root,'server/controllers/userController.js'),'utf8');
  assert.ok(!userCtrl.includes('role'), 'userController must never read or set role from client requests');
});
test('Admin routes require real JWT auth, not a shared static key', () => {
  const adminRoutes = readFileSync(join(root,'server/routes/adminRoutes.js'),'utf8');
  assert.ok(adminRoutes.includes('requireAuth') && adminRoutes.includes('requireAdmin'), 'Admin routes must use JWT-based middleware');
  assert.ok(!adminRoutes.includes('ADMIN_KEY'), 'Old shared-key pattern must be fully removed');
  const adminCtrl = readFileSync(join(root,'server/controllers/adminController.js'),'utf8');
  assert.ok(!adminCtrl.includes('ADMIN_KEY'), 'adminController must not reference the old shared key');
});
test('Rating model verifies against real bookings, not client claim', () => {
  const src = readFileSync(join(root,'server/controllers/ratingController.js'),'utf8');
  assert.ok(src.includes('Booking.findOne'), 'Verification must check real Booking records server-side');
  assert.ok(!src.includes('req.body.isVerified'), 'isVerified must never be trusted from client input');
});

console.log(`\n══════════════════════════════════════`);
console.log(`  RESULT: ${p} passed, ${f} failed`);
console.log(`══════════════════════════════════════\n`);
if(f>0) process.exit(1);
