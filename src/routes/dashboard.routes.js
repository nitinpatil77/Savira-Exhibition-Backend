import { Router } from 'express';
import { getReport, getStats } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireAuth, getStats);
router.get('/report', requireAuth, getReport);

export default router;
