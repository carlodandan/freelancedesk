/**
 * FreelanceDesk Domain Validation Utilities
 * Ensures strict input validation across financial and business entities.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateClient(input: {
  name?: string;
  email?: string;
  phone?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length === 0) {
    errors.name = "Client name is required";
  }

  if (input.email && input.email.trim().length > 0 && !isValidEmail(input.email.trim())) {
    errors.email = "Invalid email address format";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCommission(input: {
  title?: string;
  client_id?: string;
  price_cents?: number;
  deposit_percentage?: number;
  deadline?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length === 0) {
    errors.title = "Commission title is required";
  }

  if (!input.client_id || input.client_id.trim().length === 0) {
    errors.client_id = "Client selection is required";
  }

  if (typeof input.price_cents !== "number" || isNaN(input.price_cents)) {
    errors.price_cents = "Price is required and must be a number";
  } else if (input.price_cents < 0) {
    errors.price_cents = "Price cannot be negative";
  }

  if (typeof input.deposit_percentage === "number") {
    if (input.deposit_percentage < 0 || input.deposit_percentage > 100) {
      errors.deposit_percentage = "Deposit percentage must be between 0 and 100";
    }
  }

  if (input.deadline && input.deadline.trim().length > 0 && !isValidDateString(input.deadline.trim())) {
    errors.deadline = "Deadline must be a valid date (YYYY-MM-DD)";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePayment(input: {
  client_id?: string;
  amount_cents?: number;
  payment_date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.client_id || input.client_id.trim().length === 0) {
    errors.client_id = "Client selection is required";
  }

  if (typeof input.amount_cents !== "number" || isNaN(input.amount_cents)) {
    errors.amount_cents = "Payment amount is required";
  } else if (input.amount_cents <= 0) {
    errors.amount_cents = "Payment amount must be greater than zero";
  }

  if (!input.payment_date || !isValidDateString(input.payment_date)) {
    errors.payment_date = "Payment date must be a valid date (YYYY-MM-DD)";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateExpense(input: {
  category_id?: string;
  amount_cents?: number;
  description?: string;
  expense_date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.category_id || input.category_id.trim().length === 0) {
    errors.category_id = "Expense category is required";
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.description = "Expense description is required";
  }

  if (typeof input.amount_cents !== "number" || isNaN(input.amount_cents)) {
    errors.amount_cents = "Expense amount is required";
  } else if (input.amount_cents <= 0) {
    errors.amount_cents = "Expense amount must be greater than zero";
  }

  if (!input.expense_date || !isValidDateString(input.expense_date)) {
    errors.expense_date = "Expense date must be a valid date (YYYY-MM-DD)";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateInvoice(input: {
  client_id?: string;
  issue_date?: string;
  due_date?: string;
  items?: Array<{ description: string; quantity: number; unit_price_cents: number }>;
  discount_cents?: number;
  tax_rate_bps?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.client_id || input.client_id.trim().length === 0) {
    errors.client_id = "Client selection is required";
  }

  if (!input.issue_date || !isValidDateString(input.issue_date)) {
    errors.issue_date = "Issue date must be a valid date (YYYY-MM-DD)";
  }

  if (input.due_date && !isValidDateString(input.due_date)) {
    errors.due_date = "Due date must be a valid date (YYYY-MM-DD)";
  }

  if (!input.items || input.items.length === 0) {
    errors.items = "Invoice must contain at least one line item";
  } else {
    input.items.forEach((item, idx) => {
      if (!item.description || item.description.trim().length === 0) {
        errors[`item_${idx}_desc`] = `Line item ${idx + 1} description is required`;
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        errors[`item_${idx}_qty`] = `Line item ${idx + 1} quantity must be at least 1`;
      }
      if (typeof item.unit_price_cents !== "number" || item.unit_price_cents < 0) {
        errors[`item_${idx}_price`] = `Line item ${idx + 1} price cannot be negative`;
      }
    });
  }

  if (typeof input.discount_cents === "number" && input.discount_cents < 0) {
    errors.discount_cents = "Discount cannot be negative";
  }

  if (typeof input.tax_rate_bps === "number" && input.tax_rate_bps < 0) {
    errors.tax_rate_bps = "Tax rate cannot be negative";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
