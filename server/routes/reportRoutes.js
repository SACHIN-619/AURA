import express from 'express';
import { submitReport, getPendingReports, updateReportStatus } from '../controllers/reportController.js';
import { requireAuth, requireAdmin } from '../controllers/authController.js';

const router = express.Router();

router.post('/:salonId', submitReport);

router.get('/admin/pending', requireAuth, requireAdmin, getPendingReports);
router.put('/admin/:salonId/:reportId', requireAuth, requireAdmin, updateReportStatus);

export default router;
