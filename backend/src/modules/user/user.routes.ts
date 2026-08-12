import { Router } from 'express';
import { getUsers, updateStatus } from './user.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

const router = Router();

// Admin-only endpoints for Team Members management
router.get('/', authenticate, authorize('admin'), getUsers);
router.patch('/:id/status', authenticate, authorize('admin'), updateStatus);

export default router;
