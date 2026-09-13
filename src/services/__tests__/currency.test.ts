import { describe, it, expect } from "vitest";
import {
  formatCents,
  parseToCents,
  calculateDeposit,
  calculateNetProfit,
} from "../currency";

describe("Currency & Monetary Utilities", () => {
  describe("formatCents", () => {
    it("formats standard integer minor units into currency strings with symbol", () => {
      expect(formatCents(150000, "₱")).toBe("₱1,500.00");
      expect(formatCents(200000, "$")).toBe("$2,000.00");
      expect(formatCents(0, "₱")).toBe("₱0.00");
    });

    it("formats small and precise amounts (₱0.01, ₱1.99)", () => {
      expect(formatCents(1, "₱")).toBe("₱0.01");
      expect(formatCents(99, "₱")).toBe("₱0.99");
      expect(formatCents(199, "₱")).toBe("₱1.99");
      expect(formatCents(99999, "₱")).toBe("₱999.99");
      expect(formatCents(199999, "₱")).toBe("₱1,999.99");
    });

    it("formats large amounts (₱100,000.00)", () => {
      expect(formatCents(10000000, "₱")).toBe("₱100,000.00");
      expect(formatCents(100000000, "₱")).toBe("₱1,000,000.00");
    });

    it("handles negative monetary values correctly", () => {
      expect(formatCents(-50000, "₱")).toBe("-₱500.00");
      expect(formatCents(-1, "₱")).toBe("-₱0.01");
    });

    it("supports suppressing trailing zeros if includeDecimals is false", () => {
      expect(formatCents(150000, "₱", false)).toBe("₱1,500");
      // But if there are remainder cents, decimals should still be included
      expect(formatCents(150050, "₱", false)).toBe("₱1,500.50");
    });
  });

  describe("parseToCents", () => {
    it("converts decimal currency strings into integer minor units (cents)", () => {
      expect(parseToCents("1,500.00")).toBe(150000);
      expect(parseToCents("₱1,500.00")).toBe(150000);
      expect(parseToCents("$1500.00")).toBe(150000);
      expect(parseToCents("2000")).toBe(200000);
    });

    it("handles boundary cent amounts precisely without floating point drift", () => {
      expect(parseToCents("0.01")).toBe(1);
      expect(parseToCents("1.99")).toBe(199);
      expect(parseToCents("999.99")).toBe(99999);
      expect(parseToCents("1,999.99")).toBe(199999);
      expect(parseToCents("100,000.00")).toBe(10000000);
    });

    it("handles single decimal places (e.g. .5 -> 50 cents)", () => {
      expect(parseToCents("10.5")).toBe(1050);
      expect(parseToCents("0.9")).toBe(90);
    });

    it("handles negative amounts and malformed input safely", () => {
      expect(parseToCents("-500.00")).toBe(-50000);
      expect(parseToCents("")).toBe(0);
      expect(parseToCents("   ")).toBe(0);
      expect(parseToCents("abc")).toBe(0);
    });
  });

  describe("calculateDeposit", () => {
    it("calculates 50% deposit correctly for ₱2,000", () => {
      const { depositCents, remainingCents } = calculateDeposit(200000, 50);
      expect(depositCents).toBe(100000);
      expect(remainingCents).toBe(100000);
    });

    it("calculates 0% deposit (full balance on delivery)", () => {
      const { depositCents, remainingCents } = calculateDeposit(200000, 0);
      expect(depositCents).toBe(0);
      expect(remainingCents).toBe(200000);
    });

    it("calculates 100% upfront deposit", () => {
      const { depositCents, remainingCents } = calculateDeposit(200000, 100);
      expect(depositCents).toBe(200000);
      expect(remainingCents).toBe(0);
    });

    it("handles custom percentages with integer rounding (e.g. 33%)", () => {
      const { depositCents, remainingCents } = calculateDeposit(100000, 33);
      expect(depositCents).toBe(33000);
      expect(remainingCents).toBe(67000);
      expect(depositCents + remainingCents).toBe(100000);
    });

    it("handles zero-value commissions", () => {
      const { depositCents, remainingCents } = calculateDeposit(0, 50);
      expect(depositCents).toBe(0);
      expect(remainingCents).toBe(0);
    });
  });

  describe("calculateNetProfit", () => {
    it("calculates Income - Expenses = Net Profit", () => {
      expect(calculateNetProfit(5000000, 1500000)).toBe(3500000);
    });

    it("handles net loss when expenses exceed income", () => {
      expect(calculateNetProfit(1000000, 1200000)).toBe(-200000);
    });

    it("handles zero values", () => {
      expect(calculateNetProfit(0, 0)).toBe(0);
    });
  });
});
