import { QuoteAdjustments, QuoteItem, QuoteTotals } from "@/domain/quote.types";

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

export const calculateItemTotal = (item: QuoteItem): number =>
  roundCurrency(item.unitPrice * item.quantity);

export const calculateQuoteTotals = (
  items: QuoteItem[],
  adjustments: QuoteAdjustments,
): QuoteTotals => {
  const subtotal = roundCurrency(
    items.reduce((accumulator, item) => accumulator + calculateItemTotal(item), 0),
  );

  const rawDiscount =
    adjustments.discountType === "percent"
      ? (subtotal * adjustments.discountValue) / 100
      : adjustments.discountValue;

  const discountAmount = roundCurrency(Math.min(rawDiscount, subtotal));
  const freight = roundCurrency(adjustments.freight);

  const taxableBase = Math.max(subtotal - discountAmount + freight, 0);
  const taxAmount = roundCurrency((taxableBase * adjustments.taxRate) / 100);
  const total = roundCurrency(taxableBase + taxAmount);

  return {
    subtotal,
    discountAmount,
    freight,
    taxAmount,
    total,
  };
};
