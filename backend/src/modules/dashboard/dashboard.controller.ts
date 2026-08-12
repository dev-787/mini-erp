import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth.js';
import { getDashboardSummaryInDb } from '../../db/dashboard.db.js';

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const range = (req.query.range as string) || '30d';
    const date_from = req.query.date_from as string;
    const date_to = req.query.date_to as string;

    const user = req.user!;

    const data = await getDashboardSummaryInDb({
      range,
      date_from,
      date_to,
      role: user.role,
      userName: user.name,
    });

    return res.json(data);
  } catch (err: any) {
    console.error('[DashboardController] getDashboardSummary error:', err);
    return res.status(500).json({ message: 'Failed to retrieve dashboard summary metrics.' });
  }
};
