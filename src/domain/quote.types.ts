export const MEASUREMENT_UNITS = ["UN", "KG", "TON"] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];
export type DiscountType = "fixed" | "percent";

export type PartyData = {
  name: string;
  document: string;
  stateRegistration: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  state: string;
  logoDataUrl?: string;
};

export type QuoteItem = {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: MeasurementUnit;
};

export type QuoteAdjustments = {
  discountType: DiscountType;
  discountValue: number;
  freight: number;
  taxRate: number;
};

export type QuoteTotals = {
  subtotal: number;
  discountAmount: number;
  freight: number;
  taxAmount: number;
  total: number;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  createdAt: string;
  updatedAt: string;
  issueDate: string;
  company: PartyData;
  client: PartyData;
  items: QuoteItem[];
  adjustments: QuoteAdjustments;
  notes: string;
  totals: QuoteTotals;
};
