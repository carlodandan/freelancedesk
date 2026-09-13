import { describe, it, expect } from "vitest";
import { generateInvoicePdf, generateReceiptPdf, getPdfCurrency } from "../pdf";
import { InvoiceItem, PaymentItem } from "../../types/entities";
import { AppSettings } from "../../types/settings";

const mockSettings: AppSettings = {
  business_name: "Creative Studio",
  freelancer_name: "Carlo Dandan",
  email: "carlo@example.com",
  phone: "+63 917 123 4567",
  address: "Manila, Philippines",
  currency_code: "PHP",
  currency_symbol: "₱",
  date_format: "YYYY-MM-DD",
  invoice_prefix: "INV-",
  default_deposit_pct: 50,
  default_payment_terms: "Payment due within 15 days.",
  theme: "paper",
  auto_backup_enabled: false,
  backup_frequency: "weekly",
};

const mockInvoice: InvoiceItem = {
  id: "inv-001",
  invoice_number: "INV-2026-002",
  client_id: "client-1",
  client_name: "Starlight Media",
  client_email: "starlight@example.com",
  client_address: "BGC, Taguig",
  issue_date: "2026-09-01",
  due_date: "2026-09-15",
  subtotal_cents: 200000,
  discount_cents: 10000,
  tax_rate_bps: 1200,
  tax_amount_cents: 22800,
  total_cents: 212800,
  total_paid_cents: 0,
  status: "draft",
  payment_instructions: "Please send payment via bank transfer or GCash.",
  notes: "Commercial license included for digital advertising.",
  items: [
    {
      id: "item-1",
      description: "Graphic Design Package (Brand Guidelines & Social Assets)",
      quantity: 1,
      unit_price_cents: 200000,
      total_price_cents: 200000,
      sort_order: 0,
    },
  ],
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

const mockPayment: PaymentItem = {
  id: "pay-001",
  client_id: "client-1",
  client_name: "Starlight Media",
  amount_cents: 100000,
  payment_date: "2026-09-02",
  payment_method: "Bank Transfer",
  reference_number: "UB-987654321",
  receipt_number: "RCP-2026-001",
  commission_title: "Brand Strategy & Design Package",
  created_at: "2026-09-02T10:00:00Z",
};

describe("PDF Generation Service (pdf.ts)", () => {
  describe("Currency Symbol Sanitization (getPdfCurrency)", () => {
    it("converts ₱ / PHP to 'PHP ' to prevent ± character corruption in standard PDF fonts", () => {
      const phpCurrency = getPdfCurrency(mockSettings);
      expect(phpCurrency).toBe("PHP ");
    });

    it("converts € / EUR to 'EUR ' to prevent Latin-1 encoding bugs", () => {
      const eurCurrency = getPdfCurrency({
        ...mockSettings,
        currency_symbol: "€",
        currency_code: "EUR",
      });
      expect(eurCurrency).toBe("EUR ");
    });

    it("preserves standard safe symbols like $", () => {
      const usdCurrency = getPdfCurrency({
        ...mockSettings,
        currency_symbol: "$",
        currency_code: "USD",
      });
      expect(usdCurrency).toBe("$");
    });
  });

  describe("Invoice PDF Generation (generateInvoicePdf)", () => {
    it("generates invoice PDF without crashing or throwing", () => {
      const doc = generateInvoicePdf(mockInvoice, mockSettings, false);
      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("does NOT contain the corrupted '±' symbol in the raw PDF output", () => {
      const doc = generateInvoicePdf(mockInvoice, mockSettings, false);
      const pdfOutput = doc.output();
      // WinAnsi character 0xB1 (±) should not appear in place of currency
      expect(pdfOutput.includes("±")).toBe(false);
      // It should include the clean ISO symbol PHP
      expect(pdfOutput.includes("PHP")).toBe(true);
    });

    it("renders invoice numbering and client name", () => {
      const doc = generateInvoicePdf(mockInvoice, mockSettings, false);
      const pdfOutput = doc.output();
      expect(pdfOutput.includes("INV-2026-002")).toBe(true);
      expect(pdfOutput.includes("Starlight Media")).toBe(true);
    });
  });

  describe("Receipt PDF Generation (generateReceiptPdf)", () => {
    it("generates receipt PDF without crashing", () => {
      const doc = generateReceiptPdf(mockPayment, mockSettings, undefined, 100000, false);
      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("does NOT contain the corrupted '±' symbol in the receipt PDF output", () => {
      const doc = generateReceiptPdf(mockPayment, mockSettings, undefined, 100000, false);
      const pdfOutput = doc.output();
      expect(pdfOutput.includes("±")).toBe(false);
      expect(pdfOutput.includes("PHP")).toBe(true);
    });

    it("renders receipt number and payment details", () => {
      const doc = generateReceiptPdf(mockPayment, mockSettings, undefined, undefined, false);
      const pdfOutput = doc.output();
      expect(pdfOutput.includes("RCP-2026-001")).toBe(true);
      expect(pdfOutput.includes("UB-987654321")).toBe(true);
    });
  });
});
