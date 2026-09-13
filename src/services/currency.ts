/**
 * FreelanceDesk Currency & Monetary Utilities
 * All monetary amounts are handled in integer minor units (centavos/cents)
 * to avoid floating-point rounding inaccuracies.
 */

export function formatCents(
  cents: number,
  currencySymbol = "₱",
  includeDecimals = true,
): string {
  if (typeof cents !== "number" || isNaN(cents)) {
    return includeDecimals ? `${currencySymbol}0.00` : `${currencySymbol}0`;
  }
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const units = Math.floor(absCents / 100);
  const remainder = absCents % 100;

  // Format with standard thousand separators
  const formattedUnits = new Intl.NumberFormat("en-US").format(units);

  let result = "";
  if (includeDecimals || remainder > 0) {
    const formattedRemainder = remainder.toString().padStart(2, "0");
    result = `${currencySymbol}${formattedUnits}.${formattedRemainder}`;
  } else {
    result = `${currencySymbol}${formattedUnits}`;
  }

  return isNegative ? `-${result}` : result;
}

export function parseToCents(amountStr: string): number {
  if (!amountStr) return 0;
  // Strip currency symbols and whitespace
  const cleaned = amountStr.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-") return 0;

  const parts = cleaned.split(".");
  const units = parseInt(parts[0] || "0", 10);
  let cents = 0;

  if (parts.length > 1) {
    const decimalPart = parts[1].slice(0, 2).padEnd(2, "0");
    cents = parseInt(decimalPart, 10);
  }

  const total = Math.abs(units) * 100 + cents;
  return cleaned.startsWith("-") ? -total : total;
}

export function calculateDeposit(
  totalCents: number,
  percentage: number,
): {
  depositCents: number;
  remainingCents: number;
} {
  const depositCents = Math.round((totalCents * percentage) / 100);
  const remainingCents = totalCents - depositCents;
  return { depositCents, remainingCents };
}

export function calculateCommissionBalance(
  priceCents: number,
  totalPaidCents: number,
  depositCents: number = 0,
): {
  remainingBalanceCents: number;
  paymentStatus: "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid";
} {
  const remainingBalanceCents = priceCents - totalPaidCents;
  let paymentStatus:
    "unpaid" | "partially_paid" | "deposit_paid" | "fully_paid" = "unpaid";

  if (remainingBalanceCents <= 0) {
    paymentStatus = "fully_paid";
  } else if (depositCents > 0 && totalPaidCents >= depositCents) {
    paymentStatus = "deposit_paid";
  } else if (totalPaidCents > 0) {
    paymentStatus = "partially_paid";
  }

  return { remainingBalanceCents, paymentStatus };
}

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unit_price_cents: number }>,
  discountCents = 0,
  taxRateBps = 0,
): {
  subtotalCents: number;
  discountCents: number;
  taxAmountCents: number;
  totalCents: number;
} {
  const subtotalCents = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price_cents || 0),
    0,
  );
  const cappedDiscount = Math.min(Math.max(0, discountCents), subtotalCents);
  const discountedSubtotal = subtotalCents - cappedDiscount;
  // tax_rate_bps is basis points (1200 bps = 12.00%)
  const taxAmountCents = Math.round(
    (discountedSubtotal * Math.max(0, taxRateBps)) / 10000,
  );
  const totalCents = discountedSubtotal + taxAmountCents;

  return {
    subtotalCents,
    discountCents: cappedDiscount,
    taxAmountCents,
    totalCents,
  };
}

export function calculateNetProfit(
  incomeCents: number,
  expenseCents: number,
): number {
  return incomeCents - expenseCents;
}
