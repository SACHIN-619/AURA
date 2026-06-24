import express from 'express';
import rateLimit from 'express-rate-limit';
import { chatQuery } from '../controllers/aiController.js';

const router = express.Router();

// Optimized rate limiter: 30 requests per minute with dynamic fallback headers
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'production' ? 30 : 100, // Looser restrictions in development mode
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'AURA AI Concierge is experiencing high traffic. Please wait a moment before sending another request.',
    fallbackRouted: !!(process.env.GROQ_API_KEY || process.env.HUGGINGFACE_API_KEY) // Flags to client if backup routing is available
  }
});

// Primary interactive chat engine route
router.post('/query', aiRateLimiter, chatQuery);

export default router;