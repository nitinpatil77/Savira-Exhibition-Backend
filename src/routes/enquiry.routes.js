import { Router } from 'express';
import {
  createEnquiry,
  listEnquiries,
  exportEnquiries,
  getEnquiry,
  updateEnquiry,
} from '../controllers/enquiry.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { enquiryLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Public: visitor submission
router.post('/', enquiryLimiter, createEnquiry);

// Admin only
router.get('/', requireAuth, listEnquiries);
router.get('/export', requireAuth, exportEnquiries);
router.get('/:id', requireAuth, getEnquiry);
router.put('/:id', requireAuth, updateEnquiry);

export default router;
