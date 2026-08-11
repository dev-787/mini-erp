import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  createInvite,
  getInviteByToken,
  acceptInvite,
  getInvites,
  revokeInvite,
  getSessions,
  revokeSession,
} from './auth.controller.js';
import { authenticate, authorize, rateLimiter } from '../../middleware/auth.middleware.js';

const router = Router();

// Public Authentication Routes
router.post('/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 15 }), login);
router.post('/refresh', refresh);
router.post('/accept-invite', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), acceptInvite);
router.get('/invite/:token', getInviteByToken);

// Authenticated Routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:id', authenticate, revokeSession);

// Admin-Only Routes
router.post('/invite', authenticate, authorize('admin'), createInvite);
router.get('/invites', authenticate, authorize('admin'), getInvites);
router.delete('/invites/:id', authenticate, authorize('admin'), revokeInvite);

export default router;
