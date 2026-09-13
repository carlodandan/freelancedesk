import { jsPDF } from "jspdf";
import { InvoiceItem, PaymentItem } from "../types/entities";
import { AppSettings } from "../types/settings";
import { formatCents } from "./currency";

/**
 * Standard 14 PDF fonts (WinAnsiEncoding) do not support the Unicode Philippine Peso (₱ / U+20B1)
 * or Euro (€ / U+20AC) character, resulting in byte truncation that renders as '±' or corrupted glyphs.
 * This helper returns standard ISO currency codes (e.g. "PHP ", "EUR ") or safe ASCII symbols
 * so documents are crisp, unambiguous, and never display corrupted characters.
 */
export function getPdfCurrency(settings: AppSettings): string {
  const symbol = settings.currency_symbol || "₱";
  const code = settings.currency_code || "PHP";
  if (symbol === "₱" || code === "PHP") return "PHP ";
  if (symbol === "€" || code === "EUR") return "EUR ";
  if (symbol.charCodeAt(0) > 127) return code ? `${code} ` : "$";
  return symbol.endsWith(" ") ? symbol : `${symbol}`;
}

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

  const pdfCurrency = getPdfCurrency(settings);

  // Margins & printable geometry
  const left = 20;
  const right = 190;
  let y = 25;

  // Header: Business & Freelancer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23); // #1C1917
  doc.text(settings.business_name || "Creative Studio", left, y);

  y += 7;
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
  doc.text("INVOICE", right, 25, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(28, 25, 23);
  doc.text(invoice.invoice_number, right, 32, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text(`Issue Date: ${invoice.issue_date}`, right, 38, { align: "right" });
  if (invoice.due_date) {
    doc.text(`Due Date: ${invoice.due_date}`, right, 43, { align: "right" });
  }

  // Divider line
  y = Math.max(y + 12, 56);
  doc.setDrawColor(229, 224, 213); // #E5E0D5
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);

  // Bill To Section
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
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
  y += 10;
  const headerHeight = 8.5;
  doc.setFillColor(244, 241, 234); // #F4F1EA
  doc.rect(left, y, right - left, headerHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text("DESCRIPTION", left + 4, y + 5.8);
  doc.text("QTY", 114, y + 5.8, { align: "center" });
  doc.text("UNIT PRICE", 154, y + 5.8, { align: "right" });
  doc.text("TOTAL", 186, y + 5.8, { align: "right" });

  y += headerHeight;

  // Table Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);

  for (const item of invoice.items) {
    const descLines = doc.splitTextToSize(item.description, 80);
    const rowHeight = Math.max(9, descLines.length * 4.5 + 4.5);
    const textY = y + 5.5;

    doc.text(descLines, left + 4, textY);
    doc.text(item.quantity.toString(), 114, textY, { align: "center" });
    doc.text(formatCents(item.unit_price_cents, pdfCurrency), 154, textY, { align: "right" });
    doc.text(formatCents(item.total_price_cents, pdfCurrency), 186, textY, { align: "right" });

    y += rowHeight;
    doc.setDrawColor(240, 236, 228);
    doc.setLineWidth(0.3);
    doc.line(left, y, right, y);
  }

  // Summary Totals Section
  y += 6;
  const totalsLeft = 115;
  const amountRight = 186;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);

  // Subtotal
  doc.text("Subtotal:", totalsLeft, y + 4);
  doc.text(formatCents(invoice.subtotal_cents, pdfCurrency), amountRight, y + 4, { align: "right" });
  y += 6.5;

  if (invoice.discount_cents > 0) {
    doc.text("Discount:", totalsLeft, y + 4);
    doc.text(`-${formatCents(invoice.discount_cents, pdfCurrency)}`, amountRight, y + 4, { align: "right" });
    y += 6.5;
  }

  if (invoice.tax_amount_cents > 0) {
    const taxPct = (invoice.tax_rate_bps / 100).toFixed(1);
    doc.text(`Tax (${taxPct}%):`, totalsLeft, y + 4);
    doc.text(formatCents(invoice.tax_amount_cents, pdfCurrency), amountRight, y + 4, { align: "right" });
    y += 6.5;
  }

  // Divider line before Total Due
  y += 2;
  doc.setDrawColor(215, 209, 198);
  doc.setLineWidth(0.4);
  doc.line(totalsLeft, y, right, y);
  y += 3;

  // Total Due Highlight Block with generous margins and padding
  const totalBoxHeight = 11;
  doc.setFillColor(250, 248, 245); // Warm paper highlight surface
  doc.rect(totalsLeft - 2, y, (right - totalsLeft) + 2, totalBoxHeight, "F");
  doc.setDrawColor(133, 77, 14); // Bronze accent border
  doc.setLineWidth(0.6);
  doc.rect(totalsLeft - 2, y, (right - totalsLeft) + 2, totalBoxHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text("Total Due:", totalsLeft + 3, y + 7.5);

  doc.setFontSize(12);
  doc.setTextColor(133, 77, 14); // Bronze total text
  doc.text(formatCents(invoice.total_cents, pdfCurrency), amountRight - 1, y + 7.5, { align: "right" });

  y += totalBoxHeight + 10;

  // Notes & Payment Instructions
  if (invoice.payment_instructions || settings.default_payment_terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 134, 122);
    doc.text("PAYMENT INSTRUCTIONS:", left, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    const instructions =
      invoice.payment_instructions || settings.default_payment_terms || "Payment due upon receipt.";
    const instLines = doc.splitTextToSize(instructions, 170);
    doc.text(instLines, left, y);
    y += instLines.length * 4.2 + 6;
  }

  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 134, 122);
    doc.text("NOTES:", left, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    const noteLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(noteLines, left, y);
    y += noteLines.length * 4.2 + 6;
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

  const pdfCurrency = getPdfCurrency(settings);
  const left = 25;
  const right = 185;
  let y = 30;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(28, 25, 23);
  doc.text(settings.business_name || "Creative Studio", left, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(87, 83, 78);
  doc.text(settings.freelancer_name || "Freelancer", left, y);

  // Badge / Title Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52); // #166534
  doc.text("PAYMENT RECEIPT", right, 30, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 134, 122);
  doc.text(`Receipt #: ${payment.receipt_number || payment.id.slice(0, 8)}`, right, 36, { align: "right" });
  doc.text(`Date: ${payment.payment_date}`, right, 41, { align: "right" });

  // Divider
  y = Math.max(y + 12, 50);
  doc.setDrawColor(229, 224, 213);
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);

  // Payment Details Box
  y += 10;
  const detailsBoxHeight = 48;
  doc.setFillColor(250, 248, 245);
  doc.rect(left, y, right - left, detailsBoxHeight, "F");
  doc.setDrawColor(229, 224, 213);
  doc.setLineWidth(0.4);
  doc.rect(left, y, right - left, detailsBoxHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 134, 122);
  doc.text("RECEIVED FROM", left + 8, y + 10);
  doc.text("PAYMENT METHOD", left + 88, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(payment.client_name, left + 8, y + 17);
  doc.text(payment.payment_method, left + 88, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 134, 122);
  doc.text("FOR", left + 8, y + 28);
  if (payment.reference_number) {
    doc.text("REFERENCE #", left + 88, y + 28);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  const title = payment.commission_title || commissionTitle || "Freelance Services";
  const titleLines = doc.splitTextToSize(title, 75);
  doc.text(titleLines, left + 8, y + 36);

  if (payment.reference_number) {
    doc.text(payment.reference_number, left + 88, y + 36);
  }

  // Amount Paid Highlight Box
  y += detailsBoxHeight + 12;
  const amountBoxHeight = 24;
  doc.setFillColor(240, 253, 244); // Light green surface
  doc.rect(left, y, right - left, amountBoxHeight, "F");
  doc.setDrawColor(187, 247, 208);
  doc.setLineWidth(0.6);
  doc.rect(left, y, right - left, amountBoxHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(22, 101, 52);
  doc.text("AMOUNT RECEIVED", left + 8, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52);
  doc.text(formatCents(payment.amount_cents, pdfCurrency), right - 8, y + 15.5, { align: "right" });

  // Remaining Balance if any
  if (remainingBalanceCents !== undefined) {
    y += amountBoxHeight + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(87, 83, 78);
    doc.text("Remaining Job Balance:", left + 8, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCents(remainingBalanceCents, pdfCurrency), right - 8, y, { align: "right" });
    y += 10;
  } else {
    y += amountBoxHeight + 10;
  }

  // Signoff
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text("This confirms that the above payment has been processed and recorded.", left, y);

  y += 18;
  doc.setDrawColor(200, 195, 185);
  doc.setLineWidth(0.4);
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
