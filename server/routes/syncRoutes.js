import express from 'express';
import rateLimit from 'express-rate-limit';
import { syncHub, syncStatus } from '../controllers/syncController.js';
const router = express.Router();
const lim = rateLimit({windowMs:60000,max:5,message:{success:false,error:'Too many sync requests'}});
router.post('/hub', lim, syncHub);
router.get('/status', syncStatus);
export default router;
