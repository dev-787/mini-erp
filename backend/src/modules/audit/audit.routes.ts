import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { getAuditLogs } from './audit.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// GET /api/audit-log (Admin, Warehouse, Sales, Accounts)
router.get('/', authorize('admin', 'warehouse', 'sales', 'accounts'), getAuditLogs);

export default router;
