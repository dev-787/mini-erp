import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth.js';
import {
  findChallans,
  findChallanById,
  createDraftChallan,
  updateDraftChallan,
  confirmChallan as dbConfirmChallan,
  cancelChallan as dbCancelChallan,
} from '../../db/challan.db.js';
import { findCustomerById } from '../../db/customer.db.js';
import {
  validateCreateChallan,
  validateUpdateChallan,
} from './challan.validator.js';

/**
 * GET /challans
 */
export const getChallans = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const status = req.query.status ? (String(req.query.status) as any) : undefined;
    const customer_id = req.query.customer_id ? String(req.query.customer_id) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const result = await findChallans({
      page,
      limit,
      status,
      customer_id,
      search,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[ChallanController] getChallans error:', err);
    return res.status(500).json({ message: 'Failed to retrieve sales challans list.' });
  }
};

/**
 * GET /challans/:id
 */
export const getChallanById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const challan = await findChallanById(id);

    if (!challan) {
      return res.status(404).json({ message: 'Challan not found.' });
    }

    return res.json(challan);
  } catch (err: any) {
    console.error('[ChallanController] getChallanById error:', err);
    return res.status(500).json({ message: 'Failed to retrieve challan details.' });
  }
};

/**
 * POST /challans (Create Draft)
 */
export const createChallan = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const validation = validateCreateChallan(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const { customer_id, items } = req.body;

    // Verify customer exists
    const customer = await findCustomerById(customer_id);
    if (!customer) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { customer_id: 'Selected customer does not exist.' },
      });
    }

    const newChallan = await createDraftChallan(
      customer_id,
      items,
      req.user!.id
    );

    return res.status(201).json({
      message: 'Draft Sales Challan created successfully',
      challan: newChallan,
    });
  } catch (err: any) {
    console.error('[ChallanController] createChallan error:', err);
    return res.status(500).json({ message: err.message || 'Failed to create sales challan.' });
  }
};

/**
 * PATCH /challans/:id (Edit Draft)
 */
export const updateChallan = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const existing = await findChallanById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Challan not found.' });
    }

    if (existing.status !== 'Draft') {
      return res.status(409).json({ message: 'Only Draft challans can be edited.' });
    }

    const validation = validateUpdateChallan(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const { customer_id, items } = req.body;

    const customer = await findCustomerById(customer_id);
    if (!customer) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: { customer_id: 'Selected customer does not exist.' },
      });
    }

    const updated = await updateDraftChallan(id, customer_id, items);

    return res.json({
      message: 'Draft Sales Challan updated successfully',
      challan: updated,
    });
  } catch (err: any) {
    if (err.code === 'NOT_DRAFT') {
      return res.status(409).json({ message: err.message });
    }
    console.error('[ChallanController] updateChallan error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update sales challan.' });
  }
};

/**
 * POST /challans/:id/confirm (Atomic Stock Deduction)
 */
export const confirmChallan = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const confirmed = await dbConfirmChallan(id, req.user!.id);

    return res.json({
      message: `Challan ${confirmed.challan_number} confirmed successfully. Inventory stock has been updated.`,
      challan: confirmed,
    });
  } catch (err: any) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({
        error: 'Insufficient stock',
        message: 'Cannot confirm challan due to insufficient stock across one or more items.',
        shortages: err.shortages || [],
      });
    }

    if (err.code === 'NOT_DRAFT') {
      return res.status(409).json({ message: err.message });
    }

    if (err.message === 'CHALLAN_NOT_FOUND') {
      return res.status(404).json({ message: 'Challan not found.' });
    }

    console.error('[ChallanController] confirmChallan error:', err);
    return res.status(500).json({ message: err.message || 'Failed to confirm sales challan.' });
  }
};

/**
 * POST /challans/:id/cancel (Draft or Confirmed Stock Reversal)
 */
export const cancelChallan = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const userRole = req.user!.role;

    const cancelled = await dbCancelChallan(id, req.user!.id, userRole);

    return res.json({
      message: `Challan ${cancelled.challan_number} cancelled successfully.`,
      challan: cancelled,
    });
  } catch (err: any) {
    if (err.code === 'FORBIDDEN_CANCEL') {
      return res.status(403).json({ message: err.message });
    }

    if (err.code === 'ALREADY_CANCELLED') {
      return res.status(409).json({ message: err.message });
    }

    if (err.message === 'CHALLAN_NOT_FOUND') {
      return res.status(404).json({ message: 'Challan not found.' });
    }

    console.error('[ChallanController] cancelChallan error:', err);
    return res.status(500).json({ message: err.message || 'Failed to cancel sales challan.' });
  }
};
