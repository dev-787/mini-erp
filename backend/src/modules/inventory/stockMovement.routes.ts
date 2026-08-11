import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { getGlobalStockMovements } from '../product/product.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// GET /api/stock-movements (Global Ledger)
router.get('/', authorize('admin', 'warehouse'), getGlobalStockMovements);

export default router;
