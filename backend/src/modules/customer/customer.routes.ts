import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getCustomerNotes,
  addCustomerNote,
} from './customer.controller.js';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// List Customers (Admin, Sales, Accounts)
router.get('/', authorize('admin', 'sales', 'accounts'), getCustomers);

// Create Customer (Admin, Sales only)
router.post('/', authorize('admin', 'sales'), createCustomer);

// Get Customer Details (Admin, Sales, Accounts)
router.get('/:id', authorize('admin', 'sales', 'accounts'), getCustomerById);

// Update Customer (Admin, Sales only)
router.patch('/:id', authorize('admin', 'sales'), updateCustomer);

// Get Customer Notes (Admin, Sales, Accounts)
router.get('/:id/notes', authorize('admin', 'sales', 'accounts'), getCustomerNotes);

// Add Follow-up Note (Admin, Sales only)
router.post('/:id/notes', authorize('admin', 'sales'), addCustomerNote);

export default router;
