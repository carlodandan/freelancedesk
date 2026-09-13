import { describe, it, expect } from "vitest";
import {
  calculateDeposit,
  calculateCommissionBalance,
  parseToCents,
} from "../../../services/currency";

describe("Commission Business Logic", () => {
  describe("Milestone and Payment Balance Transitions", () => {
    it("₱2,000 with 50% deposit → ₱1,000 deposit required", () => {
      const priceCents = 200000;
      const { depositCents, remainingCents } = calculateDeposit(priceCents, 50);
      expect(depositCents).toBe(100000);
      expect(remainingCents).toBe(100000);

      const balance = calculateCommissionBalance(priceCents, 0, depositCents);
      expect(balance.remainingBalanceCents).toBe(200000);
      expect(balance.paymentStatus).toBe("unpaid");
    });

    it("₱2,000 with ₱500 paid → ₱1,500 remaining", () => {
      const priceCents = 200000;
      const depositCents = 100000;
      const paidCents = 50000;

      const balance = calculateCommissionBalance(priceCents, paidCents, depositCents);
      expect(balance.remainingBalanceCents).toBe(150000);
      expect(balance.paymentStatus).toBe("partially_paid");
    });

    it("₱2,000 with ₱500 + ₱500 paid → ₱1,000 remaining (deposit satisfied)", () => {
      const priceCents = 200000;
      const depositCents = 100000;
      const payment1 = 50000;
      const payment2 = 50000;
      const totalPaid = payment1 + payment2;

      const balance = calculateCommissionBalance(priceCents, totalPaid, depositCents);
      expect(balance.remainingBalanceCents).toBe(100000);
      expect(balance.paymentStatus).toBe("deposit_paid");
    });

    it("₱2,000 with ₱1,000 + ₱1,000 paid → ₱0 remaining (fully paid)", () => {
      const priceCents = 200000;
      const depositCents = 100000;
      const payment1 = 100000;
      const payment2 = 100000;
      const totalPaid = payment1 + payment2;

      const balance = calculateCommissionBalance(priceCents, totalPaid, depositCents);
      expect(balance.remainingBalanceCents).toBe(0);
      expect(balance.paymentStatus).toBe("fully_paid");
    });
  });

  describe("Deposit percentage edge cases", () => {
    it("0% deposit commission (full balance due upon completion)", () => {
      const priceCents = 200000;
      const { depositCents, remainingCents } = calculateDeposit(priceCents, 0);
      expect(depositCents).toBe(0);
      expect(remainingCents).toBe(200000);

      // Unpaid initially
      let balance = calculateCommissionBalance(priceCents, 0, depositCents);
      expect(balance.paymentStatus).toBe("unpaid");

      // With partial payment of ₱500
      balance = calculateCommissionBalance(priceCents, 50000, depositCents);
      expect(balance.remainingBalanceCents).toBe(150000);
      expect(balance.paymentStatus).toBe("partially_paid");

      // With full payment of ₱2,000
      balance = calculateCommissionBalance(priceCents, 200000, depositCents);
      expect(balance.remainingBalanceCents).toBe(0);
      expect(balance.paymentStatus).toBe("fully_paid");
    });

    it("100% deposit commission (upfront full payment required)", () => {
      const priceCents = 200000;
      const { depositCents, remainingCents } = calculateDeposit(priceCents, 100);
      expect(depositCents).toBe(200000);
      expect(remainingCents).toBe(0);

      // Partial payment
      let balance = calculateCommissionBalance(priceCents, 100000, depositCents);
      expect(balance.remainingBalanceCents).toBe(100000);
      expect(balance.paymentStatus).toBe("partially_paid");

      // Full payment satisfies both deposit and total
      balance = calculateCommissionBalance(priceCents, 200000, depositCents);
      expect(balance.remainingBalanceCents).toBe(0);
      expect(balance.paymentStatus).toBe("fully_paid");
    });

    it("custom deposit percentages (e.g. 25%, 33.3%, 75%)", () => {
      const priceCents = 400000; // ₱4,000.00
      const { depositCents: dep25 } = calculateDeposit(priceCents, 25);
      expect(dep25).toBe(100000); // ₱1,000.00

      const { depositCents: dep75 } = calculateDeposit(priceCents, 75);
      expect(dep75).toBe(300000); // ₱3,000.00
    });
  });

  describe("Payment edge cases: overpayments, multiple payments, decimal inputs", () => {
    it("handles overpayments gracefully by resulting in negative remaining balance", () => {
      const priceCents = 200000;
      const totalPaid = 250000; // ₱2,500 paid on ₱2,000 commission (e.g. generous tip)

      const balance = calculateCommissionBalance(priceCents, totalPaid, 100000);
      expect(balance.remainingBalanceCents).toBe(-50000);
      expect(balance.paymentStatus).toBe("fully_paid");
    });

    it("handles multiple sequential micro-payments", () => {
      const priceCents = 100000; // ₱1,000
      const payments = [20000, 30000, 25000, 25000]; // ₱200 + ₱300 + ₱250 + ₱250 = ₱1,000
      const totalPaid = payments.reduce((a, b) => a + b, 0);

      const balance = calculateCommissionBalance(priceCents, totalPaid, 50000);
      expect(balance.remainingBalanceCents).toBe(0);
      expect(balance.paymentStatus).toBe("fully_paid");
    });

    it("handles zero-value commissions", () => {
      const balance = calculateCommissionBalance(0, 0, 0);
      expect(balance.remainingBalanceCents).toBe(0);
      expect(balance.paymentStatus).toBe("fully_paid");
    });

    it("parses decimal currency values accurately for commission input", () => {
      const price = parseToCents("1,250.75");
      const depositPct = 50;
      const { depositCents, remainingCents } = calculateDeposit(price, depositPct);

      expect(price).toBe(125075);
      expect(depositCents).toBe(62538); // Math.round(125075 * 0.5) = 62537.5 -> 62538
      expect(remainingCents).toBe(62537);
      expect(depositCents + remainingCents).toBe(price);
    });
  });
});
