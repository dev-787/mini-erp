export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateCreateChallan = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Customer ID
  if (!body.customer_id || typeof body.customer_id !== 'string' || body.customer_id.trim().length === 0) {
    errors.customer_id = 'Customer selection is required.';
  }

  // Items
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.items = 'At least one product item is required for a sales challan.';
  } else {
    body.items.forEach((item: any, index: number) => {
      if (!item.product_id || typeof item.product_id !== 'string') {
        errors[`items[${index}].product_id`] = `Product ID is required for item #${index + 1}.`;
      }
      if (item.quantity === undefined || item.quantity === null || isNaN(Number(item.quantity))) {
        errors[`items[${index}].quantity`] = `Quantity is required for item #${index + 1}.`;
      } else {
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          errors[`items[${index}].quantity`] = `Quantity for item #${index + 1} must be a positive integer greater than zero.`;
        }
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUpdateChallan = (body: any): ValidationResult => {
  return validateCreateChallan(body);
};
