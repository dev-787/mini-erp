import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  getStockMovements,
  addStockMovement,
  getLowStockProducts,
  getInventorySummary,
  getGlobalStockMovements,
} from './product.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// Global Stock Movements Ledger (Admin, Warehouse only)
router.get('/stock-movements', authorize('admin', 'warehouse'), getGlobalStockMovements);

// Aggregate Inventory Summary Stats (Admin, Warehouse only)
router.get('/inventory/summary', authorize('admin', 'warehouse'), getInventorySummary);

// Low-stock Inventory Report (Admin, Warehouse only)
router.get('/inventory/low-stock', authorize('admin', 'warehouse'), getLowStockProducts);

// List Products (Admin, Warehouse, Sales)
router.get('/', authorize('admin', 'warehouse', 'sales'), getProducts);

// Create Product (Admin, Warehouse only)
router.post('/', authorize('admin', 'warehouse'), createProduct);

// Get Product Details (Admin, Warehouse, Sales)
router.get('/:id', authorize('admin', 'warehouse', 'sales'), getProductById);

// Update Product (Admin, Warehouse only)
router.patch('/:id', authorize('admin', 'warehouse'), updateProduct);

// Get Stock Movement History for single product (Admin, Warehouse, Sales)
router.get('/:id/stock-movements', authorize('admin', 'warehouse', 'sales'), getStockMovements);

// Log Stock Movement IN/OUT (Admin, Warehouse only)
router.post('/:id/stock-movements', authorize('admin', 'warehouse'), addStockMovement);

export default router;
