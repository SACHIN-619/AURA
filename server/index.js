import 'dotenv/config';
import express  from 'express';
import cors     from 'cors';
import helmet   from 'helmet';
import morgan   from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import connectDB     from './config/database.js';
import syncRoutes    from './routes/syncRoutes.js';
import salonRoutes   from './routes/salonRoutes.js';
import aiRoutes      from './routes/aiRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import userRoutes    from './routes/userRoutes.js';
import searchRoutes  from './routes/searchRoutes.js';
import ratingRoutes  from './routes/ratingRoutes.js';
import adminRoutes   from './routes/adminRoutes.js';
import authRoutes    from './routes/authRoutes.js';
import mirrorRoutes  from './routes/mirrorRoutes.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = join(__dirname, '..', 'client', 'dist');
const app  = express();
const PORT = process.env.PORT || 5000;

// Initialize database connection
connectDB();

// 1. Hardened Dynamic CORS Strategy
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests or local development tools
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS policy blockage: ${origin} not permitted.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Middleware Stack
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '15mb' })); // Increased slightly for ultra-res AI Mirror canvas images
app.use(express.urlencoded({ extended: false, limit: '15mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve static production bundle files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST));
}

// 3. API Routers Matrix
app.use('/api/sync',     syncRoutes);
app.use('/api/salons',   salonRoutes);
app.use('/api/chat',     aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/ratings',  ratingRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/mirror',   mirrorRoutes);

// Enhanced Health Diagnostic Route
app.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'AURA Marketplace API',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    ai_failover_ready: !!(process.env.GEMINI_API_KEY && (process.env.GROQ_API_KEY || process.env.HUGGINGFACE_API_KEY)),
    integrations: {
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      hf: !!process.env.HUGGINGFACE_API_KEY
    },
  });
});

// Single Page Application Route Redirection (Production Mode)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_, res) => res.sendFile(join(CLIENT_DIST, 'index.html')));
}

// Fallthrough 404 Route Deflector
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Target resource mapping missing: ${req.method} ${req.originalUrl}`
  });
});

// Global Application Error Interceptor Layer
app.use((err, _req, res, _next) => {
  console.error('[System Exception Intercepted]:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'A network error occurred. Processing failed.' 
      : err.message
  });
});

// Initialize Framework Process Listener Loop
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   ✨  AURA MARKETPLACE API  ✨        ║`);
  console.log(`  ║   Hyderabad Luxury Grooming Hub       ║`);
  console.log(`  ║   Port: ${PORT}                          ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
  console.log(`  🚀 Node Env:    ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✅ Gemini Core: ${process.env.GEMINI_API_KEY ? 'ACTIVE' : 'MISSING'}`);
  console.log(`  ✅ Groq Guard:  ${process.env.GROQ_API_KEY ? 'ACTIVE' : 'MISSING'}`);
  console.log(`  ✅ HuggingFace: ${process.env.HUGGINGFACE_API_KEY ? 'ACTIVE' : 'MISSING'}\n`);
});

export default app;