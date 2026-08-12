import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getDashboardSummary } from './dashboard.controller.js';

const router = Router();

// GET /api/dashboard/summary (or /dashboard/summary)
router.get('/summary', authenticate, getDashboardSummary);

export default router;
