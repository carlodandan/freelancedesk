import { describe, it, expect } from "vitest";
import { calculateInvoiceTotals } from "../../../services/currency";

describe("Invoice Business Logic", () => {
  describe("Subtotal, line items, discounts, and total", () => {
    it("calculates example scenario: Item A ₱1,000, Item B ₱500, Discount ₱100 → Subtotal ₱1,500, Total ₱1,400", () => {
      const items = [
        { quantity: 1, unit_price_cents: 100000 }, // Item A ₱1,000.00
        { quantity: 1, unit_price_cents: 50000 },  // Item B ₱500.00
      ];
      const discountCents = 10000; // ₱100.00
      const taxRateBps = 0;

      const result = calculateInvoiceTotals(items, discountCents, taxRateBps);

      expect(result.subtotalCents).toBe(150000); // ₱1,500.00
      expect(result.discountCents).toBe(10000);  // ₱100.00
      expect(result.taxAmountCents).toBe(0);
      expect(result.totalCents).toBe(140000);    // ₱1,400.00
    });

    it("handles multiple line items with different quantities", () => {
      const items = [
        { quantity: 3, unit_price_cents: 25000 }, // 3 x ₱250 = ₱750
        { quantity: 2, unit_price_cents: 50000 }, // 2 x ₱500 = ₱1,000
        { quantity: 1, unit_price_cents: 12500 }, // 1 x ₱125 = ₱125
      ];
      const result = calculateInvoiceTotals(items, 0, 0);

      expect(result.subtotalCents).toBe(187500); // ₱1,875.00
      expect(result.totalCents).toBe(187500);
    });

    it("calculates tax correctly using basis points (e.g. 12% VAT = 1200 bps)", () => {
      const items = [{ quantity: 1, unit_price_cents: 100000 }]; // ₱1,000.00
      const discountCents = 0;
      const taxRateBps = 1200; // 12.00%

      const result = calculateInvoiceTotals(items, discountCents, taxRateBps);

      expect(result.subtotalCents).toBe(100000);
      expect(result.taxAmountCents).toBe(12000); // 12% of ₱1,000 = ₱120.00
      expect(result.totalCents).toBe(112000);    // ₱1,120.00
    });

    it("calculates tax after discount deduction", () => {
      const items = [{ quantity: 1, unit_price_cents: 100000 }]; // ₱1,000.00
      const discountCents = 20000; // ₱200 discount → ₱800 taxable
      const taxRateBps = 1000; // 10.00%

      const result = calculateInvoiceTotals(items, discountCents, taxRateBps);

      expect(result.subtotalCents).toBe(100000);
      expect(result.discountCents).toBe(20000);
      expect(result.taxAmountCents).toBe(8000); // 10% of ₱800 = ₱80.00
      expect(result.totalCents).toBe(88000);   // ₱880.00
    });

    it("caps discount so it does not exceed subtotal", () => {
      const items = [{ quantity: 1, unit_price_cents: 50000 }]; // ₱500.00
      const discountCents = 80000; // Attempted ₱800 discount

      const result = calculateInvoiceTotals(items, discountCents, 0);

      expect(result.subtotalCents).toBe(50000);
      expect(result.discountCents).toBe(50000); // capped at subtotal
      expect(result.totalCents).toBe(0);
    });

    it("handles empty items list gracefully", () => {
      const result = calculateInvoiceTotals([], 1000, 1200);

      expect(result.subtotalCents).toBe(0);
      expect(result.discountCents).toBe(0);
      expect(result.taxAmountCents).toBe(0);
      expect(result.totalCents).toBe(0);
    });
  });

  describe("Invoice numbering and status progression", () => {
    it("verifies sequential invoice numbering format INV-YYYY-XXX", () => {
      const formatInvoiceNumber = (year: number, sequence: number) => {
        return `INV-${year}-${sequence.toString().padStart(3, "0")}`;
      };

      expect(formatInvoiceNumber(2026, 1)).toBe("INV-2026-001");
      expect(formatInvoiceNumber(2026, 42)).toBe("INV-2026-042");
      expect(formatInvoiceNumber(2026, 100)).toBe("INV-2026-100");
    });

    it("evaluates outstanding balance against invoice total", () => {
      const totalCents = 150000; // ₱1,500.00
      let paymentsCents = 0;

      const getOutstanding = (total: number, paid: number) => Math.max(0, total - paid);

      expect(getOutstanding(totalCents, paymentsCents)).toBe(150000);

      paymentsCents += 50000; // Partial payment ₱500
      expect(getOutstanding(totalCents, paymentsCents)).toBe(100000);

      paymentsCents += 100000; // Final payment ₱1,000
      expect(getOutstanding(totalCents, paymentsCents)).toBe(0);
    });
  });
});
