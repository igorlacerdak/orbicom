import { ForbiddenError } from "@/server/errors";
import { getWorkspaceContext, hasAnyRole } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";

export type FinanceEntryType = "receivable" | "payable";
export type FinanceEntryStatus = "open" | "partial" | "paid" | "overdue" | "cancelled";

export type SettleReceivableInput = {
  amount: number;
  paidAt?: string;
  method?: string;
  notes?: string;
};

export type FinanceEntrySummary = {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  entryType: FinanceEntryType;
  category: string;
  description: string;
  counterpartyName: string;
  paymentMethod: string;
  status: FinanceEntryStatus;
  installmentNumber: number;
  installmentTotal: number;
  amountTotal: number;
  amountPaid: number;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
};

export type FinanceListFilters = {
  order?: string;
  client?: string;
  statuses?: FinanceEntryStatus[];
  paymentMethods?: Array<"a_vista" | "boleto" | "pix" | "cartao_credito">;
};

const asSingle = <T>(value: T | T[] | null): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const ensureFinanceRole = async () => {
  const workspace = await getWorkspaceContext();
  if (!hasAnyRole(workspace.roles, ["owner", "admin", "finance"])) {
    throw new ForbiddenError("Apenas Dono/Administrador/Financeiro podem acessar o financeiro.");
  }

  return workspace;
};

const mapFinanceEntry = (
  row: FinanceEntryRow,
): FinanceEntrySummary => {
  const order = asSingle(row.orders);
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: order?.order_number ?? null,
    entryType: row.entry_type,
    category: row.category,
    description: row.description,
    counterpartyName: row.counterparty_name,
    paymentMethod: row.payment_method,
    status: row.status,
    installmentNumber: row.installment_number,
    installmentTotal: row.installment_total,
    amountTotal: Number(row.amount_total),
    amountPaid: Number(row.amount_paid),
    dueDate: row.due_date,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
  };
};

type FinanceEntryRow = {
  id: string;
  order_id: string | null;
  entry_type: FinanceEntryType;
  category: string;
  description: string;
  counterparty_name: string;
  payment_method: string;
  status: "open" | "partial" | "paid" | "overdue" | "cancelled";
  installment_number: number;
  installment_total: number;
  amount_total: number;
  amount_paid: number;
  due_date: string;
  issued_at: string;
  paid_at: string | null;
  orders: { order_number: string } | { order_number: string }[] | null;
};

export const financeService = {
  async list(entryType: FinanceEntryType, filters?: FinanceListFilters): Promise<FinanceEntrySummary[]> {
    const workspace = await ensureFinanceRole();
    const supabase = await createClient();

    let query = supabase
      .from("financial_entries")
      .select("id,order_id,entry_type,category,description,counterparty_name,payment_method,status,installment_number,installment_total,amount_total,amount_paid,due_date,issued_at,paid_at,orders(order_number)")
      .eq("workspace_id", workspace.workspaceId)
      .eq("entry_type", entryType);

    const orderFilter = filters?.order?.trim();
    const clientFilter = filters?.client?.trim();
    const statusFilter = filters?.statuses ?? [];
    const paymentMethodFilter = filters?.paymentMethods ?? [];

    if (orderFilter) {
      query = query.ilike("description", `%${orderFilter}%`);
    }

    if (clientFilter) {
      query = query.ilike("counterparty_name", `%${clientFilter}%`);
    }

    if (statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }

    if (paymentMethodFilter.length > 0) {
      query = query.in("payment_method", paymentMethodFilter);
    }

    const { data, error } = await query
      .order("due_date", { ascending: true })
      .order("installment_number", { ascending: true });

    if (error) {
      throw new Error(`Falha ao listar lancamentos financeiros: ${error.message}`);
    }

    const rows = (data as FinanceEntryRow[] | null) ?? [];
    return rows.map(mapFinanceEntry);
  },

  async ensureReceivablesFromOrder(orderId: string) {
    await ensureFinanceRole();
    const supabase = await createClient();

    const { error } = await supabase.rpc("ensure_receivables_for_order", {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`Falha ao gerar contas a receber do pedido: ${error.message}`);
    }
  },

  async settleReceivable(entryId: string, input: SettleReceivableInput) {
    await ensureFinanceRole();
    const supabase = await createClient();

    const { error } = await supabase.rpc("settle_receivable_entry", {
      p_entry_id: entryId,
      p_amount: input.amount,
      p_paid_at: input.paidAt ?? null,
      p_method: input.method ?? null,
      p_notes: input.notes ?? null,
    });

    if (error) {
      throw new Error(`Falha ao realizar baixa financeira: ${error.message}`);
    }
  },

  async reopenBilledOrder(orderId: string) {
    await ensureFinanceRole();
    const supabase = await createClient();

    const { error } = await supabase.rpc("reopen_billed_order_without_payments", {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`Falha ao reabrir pedido faturado: ${error.message}`);
    }
  },

  async reverseOrderFinanceTotal(orderId: string) {
    await ensureFinanceRole();
    const supabase = await createClient();

    const { error } = await supabase.rpc("reverse_order_finance_total", {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`Falha ao estornar financeiro do pedido: ${error.message}`);
    }
  },
};
