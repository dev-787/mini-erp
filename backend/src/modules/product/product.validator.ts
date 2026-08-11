import { MovementType } from '../../types/product.js';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateCreateProduct = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.name = 'Product name is required and must be at least 2 characters.';
  } else if (body.name.trim().length > 255) {
    errors.name = 'Product name cannot exceed 255 characters.';
  }

  // SKU
  if (!body.sku || typeof body.sku !== 'string' || body.sku.trim().length === 0) {
    errors.sku = 'SKU code is required.';
  } else {
    const cleanSku = body.sku.trim();
    const skuRegex = /^[a-zA-Z0-9\-]+$/;
    if (cleanSku.length > 50) {
      errors.sku = 'SKU code cannot exceed 50 characters.';
    } else if (!skuRegex.test(cleanSku)) {
      errors.sku = 'SKU code can only contain letters, numbers, and hyphens.';
    }
  }

  // Unit Price
  if (body.unit_price === undefined || body.unit_price === null || isNaN(Number(body.unit_price))) {
    errors.unit_price = 'Unit price is required and must be a valid number.';
  } else if (Number(body.unit_price) < 0) {
    errors.unit_price = 'Unit price cannot be negative.';
  }

  // Min Stock Alert Threshold
  if (body.min_stock_alert === undefined || body.min_stock_alert === null || isNaN(Number(body.min_stock_alert))) {
    errors.min_stock_alert = 'Minimum stock alert threshold is required.';
  } else if (!Number.isInteger(Number(body.min_stock_alert)) || Number(body.min_stock_alert) < 0) {
    errors.min_stock_alert = 'Minimum stock alert threshold must be a non-negative integer.';
  }

  // Current Stock / Opening Stock (Create only)
  if (body.current_stock !== undefined && body.current_stock !== null && body.current_stock !== '') {
    if (isNaN(Number(body.current_stock)) || !Number.isInteger(Number(body.current_stock)) || Number(body.current_stock) < 0) {
      errors.current_stock = 'Opening stock quantity must be a non-negative integer.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUpdateProduct = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name (optional on update)
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters.';
    } else if (body.name.trim().length > 255) {
      errors.name = 'Product name cannot exceed 255 characters.';
    }
  }

  // Unit Price (optional on update)
  if (body.unit_price !== undefined) {
    if (isNaN(Number(body.unit_price)) || Number(body.unit_price) < 0) {
      errors.unit_price = 'Unit price must be a non-negative number.';
    }
  }

  // Min Stock Alert (optional on update)
  if (body.min_stock_alert !== undefined) {
    if (isNaN(Number(body.min_stock_alert)) || !Number.isInteger(Number(body.min_stock_alert)) || Number(body.min_stock_alert) < 0) {
      errors.min_stock_alert = 'Minimum stock alert threshold must be a non-negative integer.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateStockMovement = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Quantity
  if (body.quantity === undefined || body.quantity === null || isNaN(Number(body.quantity))) {
    errors.quantity = 'Movement quantity is required.';
  } else {
    const qty = Number(body.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      errors.quantity = 'Movement quantity must be a positive integer greater than zero.';
    }
  }

  // Movement Type
  const validTypes: MovementType[] = ['IN', 'OUT'];
  if (!body.movement_type || !validTypes.includes(body.movement_type)) {
    errors.movement_type = 'Movement type is required and must be either IN or OUT.';
  }

  // Reason
  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    errors.reason = 'Reason for stock movement is required.';
  } else if (body.reason.trim().length > 255) {
    errors.reason = 'Reason cannot exceed 255 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
