import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth.js';
import {
  findProducts,
  findProductById,
  findProductBySku,
  insertProduct,
  updateProduct as dbUpdateProduct,
  findStockMovements,
  recordStockMovement,
  findLowStockProducts,
} from '../../db/product.db.js';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateStockMovement,
} from './product.validator.js';

/**
 * GET /products
 */
export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const category = req.query.category ? String(req.query.category).trim() : undefined;
    const low_stock = req.query.low_stock === 'true' || req.query.low_stock === '1';

    const result = await findProducts({
      page,
      limit,
      search,
      category,
      low_stock,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[ProductController] getProducts error:', err);
    return res.status(500).json({ message: 'Failed to retrieve products list.' });
  }
};

/**
 * GET /products/:id
 */
export const getProductById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const product = await findProductById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json(product);
  } catch (err: any) {
    console.error('[ProductController] getProductById error:', err);
    return res.status(500).json({ message: 'Failed to retrieve product details.' });
  }
};

/**
 * POST /products
 */
export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const validation = validateCreateProduct(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const cleanSku = String(req.body.sku).trim().toUpperCase();

    // Check SKU uniqueness
    const existingSku = await findProductBySku(cleanSku);
    if (existingSku) {
      return res.status(409).json({
        error: 'Validation failed',
        fields: { sku: 'A product with this SKU code already exists.' },
      });
    }

    const {
      name,
      category,
      unit_price,
      current_stock,
      min_stock_alert,
      location,
    } = req.body;

    const openingStock = Math.max(0, parseInt(current_stock) || 0);

    const newProduct = await insertProduct({
      name: name.trim(),
      sku: cleanSku,
      category: category ? category.trim() : null,
      unit_price: parseFloat(unit_price),
      current_stock: openingStock,
      min_stock_alert: parseInt(min_stock_alert) || 0,
      location: location ? location.trim() : null,
      created_by: req.user!.id,
    });

    // Record initial opening stock movement log if > 0
    if (openingStock > 0) {
      await recordStockMovement(
        newProduct.id,
        openingStock,
        'IN',
        'Opening Stock Balance',
        req.user!.id
      ).catch((err) => console.warn('[OpeningStockLog] Failed to record initial log:', err));
    }

    return res.status(201).json({
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (err: any) {
    console.error('[ProductController] createProduct error:', err);
    return res.status(500).json({ message: 'Failed to create product.' });
  }
};

/**
 * PATCH /products/:id (current_stock is NOT editable here)
 */
export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const existing = await findProductById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const validation = validateUpdateProduct(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.category !== undefined) updates.category = req.body.category ? req.body.category.trim() : null;
    if (req.body.unit_price !== undefined) updates.unit_price = parseFloat(req.body.unit_price);
    if (req.body.min_stock_alert !== undefined) updates.min_stock_alert = parseInt(req.body.min_stock_alert);
    if (req.body.location !== undefined) updates.location = req.body.location ? req.body.location.trim() : null;

    const updated = await dbUpdateProduct(id, updates);

    return res.json({
      message: 'Product details updated successfully',
      product: updated,
    });
  } catch (err: any) {
    console.error('[ProductController] updateProduct error:', err);
    return res.status(500).json({ message: 'Failed to update product details.' });
  }
};

/**
 * GET /products/:id/stock-movements
 */
export const getStockMovements = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));

    const existing = await findProductById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const movements = await findStockMovements(id, page, limit);
    return res.json(movements);
  } catch (err: any) {
    console.error('[ProductController] getStockMovements error:', err);
    return res.status(500).json({ message: 'Failed to retrieve stock movement history.' });
  }
};

/**
 * POST /products/:id/stock-movements (Atomic DB Transaction)
 */
export const addStockMovement = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const existing = await findProductById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const validation = validateStockMovement(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: validation.errors,
      });
    }

    const { quantity, movement_type, reason } = req.body;

    const result = await recordStockMovement(
      id,
      parseInt(quantity),
      movement_type,
      reason.trim(),
      req.user!.id
    );

    return res.status(201).json({
      message: `Stock ${movement_type} movement logged successfully`,
      product: result.product,
      movement: result.movement,
    });
  } catch (err: any) {
    if (err.code === 'INSUFFICIENT_STOCK' || err.message?.includes('Insufficient stock')) {
      return res.status(409).json({
        error: 'Insufficient stock',
        message: err.message || 'Insufficient stock for this OUT movement.',
      });
    }

    console.error('[ProductController] addStockMovement error:', err);
    return res.status(500).json({ message: 'Failed to log stock movement.' });
  }
};

/**
 * GET /inventory/low-stock
 */
export const getLowStockProducts = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const products = await findLowStockProducts();
    return res.json({ data: products, total: products.length });
  } catch (err: any) {
    console.error('[ProductController] getLowStockProducts error:', err);
    return res.status(500).json({ message: 'Failed to retrieve low stock inventory report.' });
  }
};
