import { MeasurementUnit, PartyData, QuoteTotals } from "@/domain/quote.types";

export type OrderStatus =
  | "awaiting_billing"
  | "billed"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type OrderPaymentMethod = "a_vista" | "boleto" | "pix" | "cartao_credito";

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
  paymentMethod: OrderPaymentMethod;
  receivableInstallmentsCount: number;
  receivableFirstDueDays: number;
  receivableIntervalDays: number;
  company: PartyData;
  client: PartyData;
  items: OrderItem[];
  notes: string;
  totals: QuoteTotals;
  createdAt: string;
  updatedAt: string;
};
