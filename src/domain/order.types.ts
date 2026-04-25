import { MeasurementUnit, PartyData, QuoteTotals } from "@/domain/quote.types";

export type OrderStatus = "open" | "processing" | "completed" | "cancelled";

export type OrderItem = {
  id: string;
  code: string;
  name: string;
  unit: MeasurementUnit;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  issueDate: string;
  status: OrderStatus;
  sourceQuoteId?: string | null;
  company: PartyData;
  client: PartyData;
  items: OrderItem[];
  notes: string;
  totals: QuoteTotals;
  createdAt: string;
  updatedAt: string;
};
