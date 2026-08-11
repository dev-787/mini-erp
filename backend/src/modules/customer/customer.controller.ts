import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth.js';
import {
  findCustomers,
  findCustomerById,
  insertCustomer,
  updateCustomer as dbUpdateCustomer,
  findCustomerNotes,
  insertCustomerNote,
} from '../../db/customer.db.js';
import {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateNote,
} from './customer.validator.js';

/**
 * GET /customers
 * Query params: page, limit, search, status, customer_type
 */
export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const status = req.query.status ? (String(req.query.status) as any) : undefined;
    const customer_type = req.query.customer_type ? (String(req.query.customer_type) as any) : undefined;

    const result = await findCustomers({
      page,
      limit,
      search,
      status,
      customer_type,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[CustomerController] getCustomers error:', err);
    return res.status(500).json({ message: 'Failed to retrieve customers list.' });
  }
};

/**
 * GET /customers/:id
 */
export const getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const customer = await findCustomerById(id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    return res.json(customer);
  } catch (err: any) {
    console.error('[CustomerController] getCustomerById error:', err);
    return res.status(500).json({ message: 'Failed to retrieve customer details.' });
  }
};

/**
 * POST /customers
 */
export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const validation = validateCreateCustomer(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const {
      name,
      mobile,
      email,
      business_name,
      gst_number,
      customer_type,
      address,
      follow_up_date,
    } = req.body;

    const newCustomer = await insertCustomer({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : null,
      business_name: business_name ? business_name.trim() : null,
      gst_number: gst_number ? gst_number.trim().toUpperCase() : null,
      customer_type,
      address: address ? address.trim() : null,
      status: 'Lead', // Default status on creation
      follow_up_date: follow_up_date ? follow_up_date.trim() : null,
      created_by: req.user!.id,
    });

    return res.status(201).json({
      message: 'Customer created successfully',
      customer: newCustomer,
    });
  } catch (err: any) {
    console.error('[CustomerController] createCustomer error:', err);
    return res.status(500).json({ message: 'Failed to create customer.' });
  }
};

/**
 * PATCH /customers/:id
 */
export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const existing = await findCustomerById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const validation = validateUpdateCustomer(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.mobile !== undefined) updates.mobile = req.body.mobile.trim();
    if (req.body.email !== undefined) updates.email = req.body.email ? req.body.email.trim() : null;
    if (req.body.business_name !== undefined) updates.business_name = req.body.business_name ? req.body.business_name.trim() : null;
    if (req.body.gst_number !== undefined) updates.gst_number = req.body.gst_number ? req.body.gst_number.trim().toUpperCase() : null;
    if (req.body.customer_type !== undefined) updates.customer_type = req.body.customer_type;
    if (req.body.address !== undefined) updates.address = req.body.address ? req.body.address.trim() : null;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.follow_up_date !== undefined) updates.follow_up_date = req.body.follow_up_date ? req.body.follow_up_date.trim() : null;

    const updated = await dbUpdateCustomer(id, updates);

    return res.json({
      message: 'Customer updated successfully',
      customer: updated,
    });
  } catch (err: any) {
    console.error('[CustomerController] updateCustomer error:', err);
    return res.status(500).json({ message: 'Failed to update customer.' });
  }
};

/**
 * GET /customers/:id/notes
 */
export const getCustomerNotes = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const existing = await findCustomerById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const notes = await findCustomerNotes(id);
    return res.json({ data: notes });
  } catch (err: any) {
    console.error('[CustomerController] getCustomerNotes error:', err);
    return res.status(500).json({ message: 'Failed to retrieve follow-up notes.' });
  }
};

/**
 * POST /customers/:id/notes
 */
export const addCustomerNote = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const existing = await findCustomerById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const validation = validateNote(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const newNote = await insertCustomerNote({
      customer_id: id,
      note: req.body.note.trim(),
      created_by: req.user!.id,
    });

    return res.status(201).json({
      message: 'Follow-up note added successfully',
      note: newNote,
    });
  } catch (err: any) {
    console.error('[CustomerController] addCustomerNote error:', err);
    return res.status(500).json({ message: 'Failed to add follow-up note.' });
  }
};
