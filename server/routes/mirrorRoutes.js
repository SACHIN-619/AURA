import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeImage } from '../controllers/mirrorController.js';
const router = express.Router();
const lim = rateLimit({windowMs:60000,max:10,message:{success:false,error:'Too many mirror requests'}});
router.post('/analyze', lim, analyzeImage);
export default router;
