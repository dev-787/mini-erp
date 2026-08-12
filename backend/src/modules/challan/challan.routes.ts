import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from './challan.controller.js';

const router = Router();

// Protect all endpoints with authentication
router.use(authenticate);

// List Challans (Admin, Sales, Warehouse, Accounts)
router.get('/', authorize('admin', 'sales', 'warehouse', 'accounts'), getChallans);

// Create Draft Challan (Admin, Sales only)
router.post('/', authorize('admin', 'sales'), createChallan);

// Get Challan Details (Admin, Sales, Warehouse, Accounts)
router.get('/:id', authorize('admin', 'sales', 'warehouse', 'accounts'), getChallanById);

// Update Draft Challan (Admin, Sales only)
router.patch('/:id', authorize('admin', 'sales'), updateChallan);

// Confirm Challan (Admin, Sales only - atomic stock deduction)
router.post('/:id/confirm', authorize('admin', 'sales'), confirmChallan);

// Cancel Challan (Admin, Sales for Draft; Admin ONLY for Confirmed enforced in controller)
router.post('/:id/cancel', authorize('admin', 'sales'), cancelChallan);

export default router;
