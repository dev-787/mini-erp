import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import {
  getInventorySummary,
  getLowStockProducts,
} from '../product/product.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// GET /api/inventory/summary
router.get('/summary', authorize('admin', 'warehouse'), getInventorySummary);

// GET /api/inventory/low-stock
router.get('/low-stock', authorize('admin', 'warehouse'), getLowStockProducts);

export default router;
