import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  isValidEmail,
  validateClient,
  validateCommission,
  validatePayment,
  validateExpense,
  validateInvoice,
} from "../validation";

describe("Domain Validation Utilities", () => {
  describe("isValidDateString", () => {
    it("accepts valid ISO date strings (YYYY-MM-DD)", () => {
      expect(isValidDateString("2026-09-14")).toBe(true);
      expect(isValidDateString("2026-02-28")).toBe(true);
      expect(isValidDateString("2024-02-29")).toBe(true); // Leap year
    });

    it("rejects invalid dates and formats", () => {
      expect(isValidDateString("")).toBe(false);
      expect(isValidDateString("2026-13-01")).toBe(false); // Invalid month 13
      expect(isValidDateString("2026-04-31")).toBe(false); // April has 30 days
      expect(isValidDateString("09/14/2026")).toBe(false); // Non-ISO format
      expect(isValidDateString("invalid-date")).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("validates well-formed email addresses", () => {
      expect(isValidEmail("client@example.com")).toBe(true);
      expect(isValidEmail("artist.studio@agency.ph")).toBe(true);
    });

    it("rejects malformed email addresses", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("client@")).toBe(false);
      expect(isValidEmail("client@example")).toBe(false);
      expect(isValidEmail("plainaddress")).toBe(false);
    });
  });

  describe("validateClient", () => {
    it("accepts valid client data", () => {
      const result = validateClient({
        name: "Maria Santos",
        email: "maria@example.com",
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects empty client name", () => {
      const result = validateClient({ name: "   " });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it("rejects invalid email address if provided", () => {
      const result = validateClient({
        name: "Maria Santos",
        email: "not-an-email",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });
  });

  describe("validateCommission", () => {
    it("accepts valid commission input", () => {
      const result = validateCommission({
        title: "Logo Design",
        client_id: "client-123",
        price_cents: 200000,
        deposit_percentage: 50,
        deadline: "2026-09-30",
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects missing title or client", () => {
      const result = validateCommission({
        title: "",
        client_id: "",
        price_cents: 100000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
      expect(result.errors.client_id).toBeDefined();
    });

    it("rejects negative prices", () => {
      const result = validateCommission({
        title: "Illustration",
        client_id: "c-1",
        price_cents: -50000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.price_cents).toContain("cannot be negative");
    });

    it("rejects invalid deposit percentages (outside 0 - 100)", () => {
      const resultLow = validateCommission({
        title: "Illustration",
        client_id: "c-1",
        price_cents: 100000,
        deposit_percentage: -10,
      });
      expect(resultLow.isValid).toBe(false);
      expect(resultLow.errors.deposit_percentage).toBeDefined();

      const resultHigh = validateCommission({
        title: "Illustration",
        client_id: "c-1",
        price_cents: 100000,
        deposit_percentage: 150,
      });
      expect(resultHigh.isValid).toBe(false);
      expect(resultHigh.errors.deposit_percentage).toBeDefined();
    });

    it("rejects invalid deadline date format", () => {
      const result = validateCommission({
        title: "Character Design",
        client_id: "c-1",
        price_cents: 100000,
        deadline: "tomorrow",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.deadline).toBeDefined();
    });
  });

  describe("validatePayment", () => {
    it("accepts valid payment input", () => {
      const result = validatePayment({
        client_id: "client-123",
        amount_cents: 100000,
        payment_date: "2026-09-14",
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects zero or negative payment amounts", () => {
      const resultZero = validatePayment({
        client_id: "client-123",
        amount_cents: 0,
        payment_date: "2026-09-14",
      });
      expect(resultZero.isValid).toBe(false);
      expect(resultZero.errors.amount_cents).toBeDefined();

      const resultNeg = validatePayment({
        client_id: "client-123",
        amount_cents: -25000,
        payment_date: "2026-09-14",
      });
      expect(resultNeg.isValid).toBe(false);
      expect(resultNeg.errors.amount_cents).toBeDefined();
    });

    it("rejects invalid payment date", () => {
      const result = validatePayment({
        client_id: "client-123",
        amount_cents: 50000,
        payment_date: "2026-99-99",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.payment_date).toBeDefined();
    });
  });

  describe("validateExpense", () => {
    it("accepts valid expense input", () => {
      const result = validateExpense({
        category_id: "cat-1",
        amount_cents: 50000,
        description: "Figma Subscription",
        expense_date: "2026-09-01",
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects missing category or description", () => {
      const result = validateExpense({
        category_id: "",
        amount_cents: 50000,
        description: "",
        expense_date: "2026-09-01",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.category_id).toBeDefined();
      expect(result.errors.description).toBeDefined();
    });

    it("rejects non-positive expense amounts", () => {
      const result = validateExpense({
        category_id: "cat-1",
        amount_cents: 0,
        description: "Equipment",
        expense_date: "2026-09-01",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.amount_cents).toBeDefined();
    });
  });

  describe("validateInvoice", () => {
    it("accepts valid invoice input", () => {
      const result = validateInvoice({
        client_id: "c-1",
        issue_date: "2026-09-14",
        items: [
          { description: "Design Services", quantity: 1, unit_price_cents: 200000 },
        ],
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects invoice with no line items", () => {
      const result = validateInvoice({
        client_id: "c-1",
        issue_date: "2026-09-14",
        items: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.items).toBeDefined();
    });

    it("rejects line item with missing description or zero quantity", () => {
      const result = validateInvoice({
        client_id: "c-1",
        issue_date: "2026-09-14",
        items: [
          { description: "", quantity: 0, unit_price_cents: -500 },
        ],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors["item_0_desc"]).toBeDefined();
      expect(result.errors["item_0_qty"]).toBeDefined();
      expect(result.errors["item_0_price"]).toBeDefined();
    });
  });
});
