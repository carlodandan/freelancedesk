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
