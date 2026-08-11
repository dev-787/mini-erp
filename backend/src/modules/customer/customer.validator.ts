import { CustomerType, CustomerStatus } from '../../types/customer.js';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateCreateCustomer = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.name = 'Customer name is required and must be at least 2 characters.';
  } else if (body.name.trim().length > 255) {
    errors.name = 'Customer name cannot exceed 255 characters.';
  }

  // Mobile
  if (!body.mobile || typeof body.mobile !== 'string') {
    errors.mobile = 'Mobile number is required.';
  } else {
    const cleaned = body.mobile.trim();
    // Allow + country code and 10 to 15 digits
    const phoneRegex = /^\+?[0-9\s\-]{10,15}$/;
    if (!phoneRegex.test(cleaned)) {
      errors.mobile = 'Invalid mobile number format. Please provide a valid 10-15 digit phone number.';
    }
  }

  // Email (optional)
  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      errors.email = 'Invalid email address format.';
    }
  }

  // GST Number (optional)
  if (body.gst_number && typeof body.gst_number === 'string' && body.gst_number.trim().length > 0) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    const cleanGst = body.gst_number.trim().toUpperCase();
    if (cleanGst.length !== 15 || !gstRegex.test(cleanGst)) {
      errors.gst_number = 'Invalid GST number. Must be a valid 15-character Indian GSTIN (e.g. 27AABCU9603R1ZM).';
    }
  }

  // Customer Type
  const validTypes: CustomerType[] = ['Retail', 'Wholesale', 'Distributor'];
  if (!body.customer_type || !validTypes.includes(body.customer_type)) {
    errors.customer_type = `Customer type is required and must be one of: ${validTypes.join(', ')}.`;
  }

  // Follow-up Date (optional)
  if (body.follow_up_date && typeof body.follow_up_date === 'string' && body.follow_up_date.trim().length > 0) {
    const date = new Date(body.follow_up_date);
    if (isNaN(date.getTime())) {
      errors.follow_up_date = 'Invalid follow-up date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUpdateCustomer = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name (optional on update)
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      errors.name = 'Customer name must be at least 2 characters.';
    } else if (body.name.trim().length > 255) {
      errors.name = 'Customer name cannot exceed 255 characters.';
    }
  }

  // Mobile (optional on update)
  if (body.mobile !== undefined) {
    const cleaned = String(body.mobile).trim();
    const phoneRegex = /^\+?[0-9\s\-]{10,15}$/;
    if (!phoneRegex.test(cleaned)) {
      errors.mobile = 'Invalid mobile number format.';
    }
  }

  // Email (optional)
  if (body.email !== undefined && body.email !== null && String(body.email).trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(body.email).trim())) {
      errors.email = 'Invalid email address format.';
    }
  }

  // GST Number (optional)
  if (body.gst_number !== undefined && body.gst_number !== null && String(body.gst_number).trim().length > 0) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    const cleanGst = String(body.gst_number).trim().toUpperCase();
    if (cleanGst.length !== 15 || !gstRegex.test(cleanGst)) {
      errors.gst_number = 'Invalid GST number format (15 characters required).';
    }
  }

  // Customer Type (optional)
  if (body.customer_type !== undefined) {
    const validTypes: CustomerType[] = ['Retail', 'Wholesale', 'Distributor'];
    if (!validTypes.includes(body.customer_type)) {
      errors.customer_type = `Customer type must be one of: ${validTypes.join(', ')}.`;
    }
  }

  // Status (optional)
  if (body.status !== undefined) {
    const validStatuses: CustomerStatus[] = ['Lead', 'Active', 'Inactive'];
    if (!validStatuses.includes(body.status)) {
      errors.status = `Status must be one of: ${validStatuses.join(', ')}.`;
    }
  }

  // Follow-up Date (optional)
  if (body.follow_up_date !== undefined && body.follow_up_date !== null && String(body.follow_up_date).trim().length > 0) {
    const date = new Date(body.follow_up_date);
    if (isNaN(date.getTime())) {
      errors.follow_up_date = 'Invalid follow-up date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateNote = (body: any): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!body.note || typeof body.note !== 'string' || body.note.trim().length === 0) {
    errors.note = 'Follow-up note text cannot be empty.';
  } else if (body.note.trim().length > 2000) {
    errors.note = 'Follow-up note cannot exceed 2000 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
