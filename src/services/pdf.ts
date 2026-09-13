import { jsPDF } from "jspdf";
import { InvoiceItem, PaymentItem } from "../types/entities";
import { AppSettings } from "../types/settings";
import { formatCents } from "./currency";

export function generateInvoicePdf(
  invoice: InvoiceItem,
  settings: AppSettings,
  saveFile = true
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currencySymbol = settings.currency_symbol || "₱";

  // Margins & styling
  const left = 20;
  let y = 25;

  // Header: Business & Freelancer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23); // #1C1917
  doc.text(settings.business_name || "Creative Studio", left, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(87, 83, 78); // #57534E
  doc.text(settings.freelancer_name || "Freelancer", left, y);

  if (settings.email) {
    y += 5;
    doc.text(settings.email, left, y);
  }
  if (settings.phone) {
    y += 5;
    doc.text(settings.phone, left, y);
  }
  if (settings.address) {
    y += 5;
    doc.text(settings.address, left, y);
  }

  // Invoice Title on Top Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(133, 77, 14); // #854D0E
  doc.text("INVOICE", 190, 25, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(28, 25, 23);
  doc.text(invoice.invoice_number, 190, 32, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text(`Issue Date: ${invoice.issue_date}`, 190, 38, { align: "right" });
  if (invoice.due_date) {
    doc.text(`Due Date: ${invoice.due_date}`, 190, 43, { align: "right" });
  }

  // Divider line
  y = Math.max(y + 12, 55);
  doc.setDrawColor(229, 224, 213); // #E5E0D5
  doc.setLineWidth(0.5);
  doc.line(left, y, 190, y);

  // Bill To Section
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text("BILLED TO:", left, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(invoice.client_name, left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  if (invoice.client_email) {
    y += 4.5;
    doc.text(invoice.client_email, left, y);
  }
  if (invoice.client_address) {
    y += 4.5;
    doc.text(invoice.client_address, left, y);
  }

  // Table Header
  y += 12;
  doc.setFillColor(244, 241, 234); // #F4F1EA
  doc.rect(left, y, 170, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text("DESCRIPTION", left + 3, y + 5.5);
  doc.text("QTY", 130, y + 5.5, { align: "center" });
  doc.text("UNIT PRICE", 155, y + 5.5, { align: "right" });
  doc.text("TOTAL", 187, y + 5.5, { align: "right" });

  // Table Rows
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);

  for (const item of invoice.items) {
    y += 6;
    doc.text(item.description, left + 3, y);
    doc.text(item.quantity.toString(), 130, y, { align: "center" });
    doc.text(formatCents(item.unit_price_cents, currencySymbol), 155, y, { align: "right" });
    doc.text(formatCents(item.total_price_cents, currencySymbol), 187, y, { align: "right" });
    y += 2;
    doc.setDrawColor(240, 236, 228);
    doc.line(left, y, 190, y);
  }

  // Summary Totals
  y += 10;
  const totalsLeft = 125;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text("Subtotal:", totalsLeft, y);
  doc.text(formatCents(invoice.subtotal_cents, currencySymbol), 187, y, { align: "right" });

  if (invoice.discount_cents > 0) {
    y += 5;
    doc.text("Discount:", totalsLeft, y);
    doc.text(`-${formatCents(invoice.discount_cents, currencySymbol)}`, 187, y, { align: "right" });
  }

  if (invoice.tax_amount_cents > 0) {
    y += 5;
    const taxPct = (invoice.tax_rate_bps / 100).toFixed(1);
    doc.text(`Tax (${taxPct}%):`, totalsLeft, y);
    doc.text(formatCents(invoice.tax_amount_cents, currencySymbol), 187, y, { align: "right" });
  }

  y += 7;
  doc.setDrawColor(133, 77, 14);
  doc.setLineWidth(0.8);
  doc.line(totalsLeft, y - 2, 190, y - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text("Total Due:", totalsLeft, y + 3);
  doc.text(formatCents(invoice.total_cents, currencySymbol), 187, y + 3, { align: "right" });

  // Notes & Payment Instructions
  y += 20;
  if (invoice.payment_instructions || settings.default_payment_terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(140, 134, 122);
    doc.text("PAYMENT INSTRUCTIONS:", left, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    const instructions =
      invoice.payment_instructions || settings.default_payment_terms || "Payment due upon receipt.";
    doc.text(instructions, left, y);
  }

  if (invoice.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(140, 134, 122);
    doc.text("NOTES:", left, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    doc.text(invoice.notes, left, y);
  }

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(168, 162, 158);
  doc.text("Thank you for your business. Generated by FreelanceDesk.", 105, 280, { align: "center" });

  if (saveFile) {
    doc.save(`${invoice.invoice_number}.pdf`);
  }

  return doc;
}

export function generateReceiptPdf(
  payment: PaymentItem,
  settings: AppSettings,
  commissionTitle?: string,
  remainingBalanceCents?: number,
  saveFile = true
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currencySymbol = settings.currency_symbol || "₱";
  const left = 25;
  let y = 30;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(28, 25, 23);
  doc.text(settings.business_name || "Creative Studio", left, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(87, 83, 78);
  doc.text(settings.freelancer_name || "Freelancer", left, y);

  // Badge / Title Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52); // #166534
  doc.text("PAYMENT RECEIPT", 185, 30, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text(`Receipt #: ${payment.receipt_number || payment.id.slice(0, 8)}`, 185, 36, { align: "right" });
  doc.text(`Date: ${payment.payment_date}`, 185, 41, { align: "right" });

  // Divider
  y += 15;
  doc.setDrawColor(229, 224, 213);
  doc.setLineWidth(0.5);
  doc.line(left, y, 185, y);

  // Payment Details Box
  y += 12;
  doc.setFillColor(250, 248, 245);
  doc.rect(left, y, 160, 45, "F");
  doc.setDrawColor(229, 224, 213);
  doc.rect(left, y, 160, 45, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text("RECEIVED FROM", left + 8, y + 10);
  doc.text("PAYMENT METHOD", left + 90, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(payment.client_name, left + 8, y + 17);
  doc.text(payment.payment_method, left + 90, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text("FOR", left + 8, y + 28);
  if (payment.reference_number) {
    doc.text("REFERENCE #", left + 90, y + 28);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(payment.commission_title || commissionTitle || "Freelance Services", left + 8, y + 35);
  if (payment.reference_number) {
    doc.text(payment.reference_number, left + 90, y + 35);
  }

  // Amount Paid Highlight
  y += 60;
  doc.setFillColor(240, 253, 244); // Light green surface
  doc.rect(left, y, 160, 24, "F");
  doc.setDrawColor(187, 247, 208);
  doc.rect(left, y, 160, 24, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text("AMOUNT RECEIVED", left + 8, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(22, 101, 52);
  doc.text(formatCents(payment.amount_cents, currencySymbol), 177, y + 15, { align: "right" });

  // Remaining Balance if any
  if (remainingBalanceCents !== undefined) {
    y += 32;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(87, 83, 78);
    doc.text("Remaining Job Balance:", left + 8, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCents(remainingBalanceCents, currencySymbol), 177, y, { align: "right" });
  }

  // Signoff
  y += 35;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text("This confirms that the above payment has been processed and recorded.", left, y);

  y += 20;
  doc.setDrawColor(200, 195, 185);
  doc.line(left, y, left + 60, y);
  doc.setFontSize(8);
  doc.setTextColor(140, 134, 122);
  doc.text("Authorized Signature / Freelancer", left, y + 5);

  doc.text("FreelanceDesk Verified Offline Record", 105, 275, { align: "center" });

  if (saveFile) {
    const filename = payment.receipt_number
      ? `${payment.receipt_number}.pdf`
      : `Receipt_${payment.id.slice(0, 8)}.pdf`;
    doc.save(filename);
  }

  return doc;
}
