export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  numeric?: boolean;
  email?: boolean;
  phone?: boolean;
  password?: boolean;
  confirmPassword?: string;
  budget?: boolean;
  price?: boolean;
  stock?: boolean;
  percentage?: boolean;
  url?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateField = (value: string | number, rules: ValidationRule): ValidationResult => {
  const errors: string[] = [];

  // Convert value to string for string-based validations
  const stringValue = typeof value === 'number' ? value.toString() : value;

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
    errors?.push('This field is required');
    return { isValid: false, errors };
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { isValid: true, errors: [] };
  }

  // Numeric value validation
  if (typeof value === 'number') {
    if (rules.minValue !== undefined && value < rules.minValue) {
      errors?.push(`Value must be at least ${rules.minValue}`);
    }
    if (rules.maxValue !== undefined && value > rules.maxValue) {
      errors?.push(`Value must be at most ${rules.maxValue}`);
    }
  }

  const trimmedValue = typeof value === 'string' ? value.trim() : value.toString();

  // Length validations (only for string values)
  if (typeof value === 'string') {
    if (rules.minLength && trimmedValue.length < rules.minLength) {
      errors?.push(`Minimum ${rules.minLength} characters required`);
    }

    if (rules.maxLength && trimmedValue.length > rules.maxLength) {
      errors?.push(`Maximum ${rules.maxLength} characters allowed`);
    }
  }

  // Pattern validation (only for string values)
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(trimmedValue)) {
    errors?.push('Invalid format');
  }

  // Email validation
  if (rules.email && typeof value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedValue)) {
      errors?.push('Please enter a valid email address');
    } else {
      // Check for domain
      const domainRegex = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(trimmedValue)) {
        errors?.push('Email must include a valid domain (e.g., @domain.com)');
      }
    }
  }

  // Phone validation
  if (rules.phone && typeof value === 'string') {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(trimmedValue)) {
      errors?.push('Please enter a valid phone number');
    }
  }

  // Password validation
  if (rules.password && typeof value === 'string') {
    if (trimmedValue.length < 8) {
      errors?.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(trimmedValue)) {
      errors?.push('Password must contain at least one capital letter');
    }
    if (!/[a-z]/.test(trimmedValue)) {
      errors?.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(trimmedValue)) {
      errors?.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedValue)) {
      errors?.push('Password must contain at least one special character');
    }
  }

  // Confirm password validation
  if (rules.confirmPassword && typeof value === 'string' && trimmedValue !== rules.confirmPassword) {
    errors?.push('Passwords do not match');
  }

  // Numeric validation
  if (rules.numeric && typeof value === 'string') {
    const numericRegex = /^[0-9]+$/;
    if (!numericRegex.test(trimmedValue)) {
      errors?.push('This field must contain only numbers');
    }
  }

  // Budget validation (numeric with optional decimal)
  if (rules.budget && typeof value === 'string') {
    const budgetRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
    if (!budgetRegex.test(trimmedValue)) {
      errors?.push('Budget must be a valid number (e.g., 1000 or 1000.50)');
    } else {
      const numValue = parseFloat(trimmedValue);
      if (numValue <= 0) {
        errors?.push('Budget must be greater than 0');
      }
    }
  }

  // Price validation
  if (rules.price && typeof value === 'string') {
    const priceRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
    if (!priceRegex.test(trimmedValue)) {
      errors?.push('Price must be a valid number (e.g., 1000 or 1000.50)');
    } else {
      const numValue = parseFloat(trimmedValue);
      if (numValue < 0) {
        errors?.push('Price cannot be negative');
      }
    }
  }

  // Stock validation
  if (rules.stock && typeof value === 'string') {
    const stockRegex = /^[0-9]+$/;
    if (!stockRegex.test(trimmedValue)) {
      errors?.push('Stock level must be a whole number');
    } else {
      const numValue = parseInt(trimmedValue);
      if (numValue < 0) {
        errors?.push('Stock level cannot be negative');
      }
    }
  }

  // Percentage validation
  if (rules.percentage && typeof value === 'string') {
    const percentageRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
    if (!percentageRegex.test(trimmedValue)) {
      errors?.push('Percentage must be a valid number');
    } else {
      const numValue = parseFloat(trimmedValue);
      if (numValue < 0 || numValue > 100) {
        errors?.push('Percentage must be between 0 and 100');
      }
    }
  }

  // URL validation
  if (rules.url && typeof value === 'string') {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(trimmedValue)) {
      errors?.push('Please enter a valid URL starting with http:// or https://');
    }
  }

  // Custom validation
  if (rules.custom && typeof value === 'string') {
    const customError = rules.custom(trimmedValue);
    if (customError) {
      errors?.push(customError);
    }
  }

  return {
    isValid: errors?.length === 0,
    errors
  };
};

export const validateForm = (formData: Record<string, string>, validationRules: Record<string, ValidationRule>): Record<string, ValidationResult> => {
  const results: Record<string, ValidationResult> = {};

  Object.keys(validationRules).forEach(fieldName => {
    const value = formData?.[fieldName] || '';
    const rules = validationRules?.[fieldName];
    
    // Handle confirm password validation
    if (rules.confirmPassword) {
      rules.confirmPassword = formData?.[rules.confirmPassword];
    }

    if (results && fieldName) {
      results[fieldName] = validateField(value, rules);
    }
  });

  return results;
};

// Predefined validation rules
export const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/
  },
  email: {
    required: true,
    email: true
  },
  phone: {
    required: true,
    phone: true
  },
  password: {
    required: true,
    password: true
  },
  confirmPassword: {
    required: true,
    confirmPassword: 'password'
  },
  title: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 500
  },
  budget: {
    budget: true
  },
  price: {
    required: true,
    price: true
  },
  stockLevel: {
    stock: true
  },
  lowStockThreshold: {
    stock: true
  },
  deliveryAddress: {
    required: true,
    minLength: 10,
    maxLength: 200
  },
  businessName: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  businessDescription: {
    minLength: 10,
    maxLength: 500
  },
  businessAddress: {
    required: true,
    minLength: 10,
    maxLength: 200
  },
  businessPhone: {
    required: true,
    phone: true
  },
  businessEmail: {
    required: true,
    email: true
  },
  website: {
    url: true
  },
  deliveryRadius: {
    numeric: true,
    custom: (value: string) => {
      const num = parseInt(value);
      if (num < 1 || num > 50) {
        return 'Delivery radius must be between 1 and 50 km';
      }
      return null;
    }
  },
  minimumOrder: {
    price: true
  },
  deliveryFee: {
    price: true
  },
  preparationTime: {
    numeric: true,
    custom: (value: string) => {
      const num = parseInt(value);
      if (num < 5 || num > 180) {
        return 'Preparation time must be between 5 and 180 minutes';
      }
      return null;
    }
  },
  itemName: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  currentStock: {
    stock: true
  },
  maxStock: {
    stock: true
  },
  cost: {
    price: true
  },
  supplier: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  reorderPoint: {
    stock: true
  },
  reorderQuantity: {
    stock: true
  },
  variantName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  variantPrice: {
    required: true,
    price: true
  },
  variantStockLevel: {
    stock: true
  },
  addOnName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  addOnPrice: {
    required: true,
    price: true
  },
  addOnMaxQuantity: {
    stock: true
  },
  categoryName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  message: {
    required: true,
    minLength: 1,
    maxLength: 1000
  },
  feedback: {
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  reason: {
    required: true,
    minLength: 10,
    maxLength: 500
  },
  location: {
    required: true,
    minLength: 5,
    maxLength: 200
  },
  estimatedTime: {
    minLength: 3,
    maxLength: 50
  }
};

// Helper function to get field-specific validation rules
export const getValidationRules = (fieldName: string): ValidationRule => {
  return VALIDATION_RULES?.[fieldName as keyof typeof VALIDATION_RULES] || {};
};

// Helper function to check if form is valid
export const isFormValid = (validationResults: Record<string, ValidationResult>): boolean => {
  return Object.values(validationResults).every(result => result.isValid);
}; 
 
 
 
 
 
 