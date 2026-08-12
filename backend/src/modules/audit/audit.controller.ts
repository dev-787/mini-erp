import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth.js';
import { findAuditLogs } from '../../db/audit.db.js';

/**
 * GET /api/audit-log
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const date_from = req.query.date_from ? String(req.query.date_from) : undefined;
    const date_to = req.query.date_to ? String(req.query.date_to) : undefined;

    const result = await findAuditLogs({
      page,
      limit,
      category,
      search,
      date_from,
      date_to,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[AuditController] getAuditLogs error:', err);
    return res.status(500).json({ message: 'Failed to retrieve system audit logs.' });
  }
};
