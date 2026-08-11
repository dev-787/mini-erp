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
} from './product.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// Low-stock cross-product inventory overview endpoint (Admin, Warehouse, Sales)
router.get('/inventory/low-stock', authorize('admin', 'warehouse', 'sales'), getLowStockProducts);

// List Products (Admin, Warehouse, Sales)
router.get('/', authorize('admin', 'warehouse', 'sales'), getProducts);

// Create Product (Admin, Warehouse only)
router.post('/', authorize('admin', 'warehouse'), createProduct);

// Get Product Details (Admin, Warehouse, Sales)
router.get('/:id', authorize('admin', 'warehouse', 'sales'), getProductById);

// Update Product (Admin, Warehouse only)
router.patch('/:id', authorize('admin', 'warehouse'), updateProduct);

// Get Stock Movement History (Admin, Warehouse, Sales)
router.get('/:id/stock-movements', authorize('admin', 'warehouse', 'sales'), getStockMovements);

// Log Stock Movement IN/OUT (Admin, Warehouse only)
router.post('/:id/stock-movements', authorize('admin', 'warehouse'), addStockMovement);

export default router;
