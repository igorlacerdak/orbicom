import type { Database } from "@repo/database/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { OrderUpdateInput } from "@/domain/order.schema";
import { Order, OrderPaymentMethod } from "@/domain/order.types";
import { financeService } from "@/server/finance-service";
import { ForbiddenError } from "@/server/errors";
import { hasAnyRole } from "@/server/workspace-context";
import { getWorkspaceContext } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";

type DbClient = SupabaseClient<Database>;

type PartyRow = {
  id: string;
  workspace_id: string;
  name: string;
  document: string;
  state_registration: string;
  phone: string;
  address: string;
  zip_code: string;
  city: string;
  state: string;
  logo_url?: string | null;
};

type OrderRow = {
  id: string;
  workspace_id: string;
  order_number: string;
  issue_date: string;
  company_id: string;
  client_id: string;
  source_quote_id: string | null;
  status: "awaiting_billing" | "billed" | "partially_paid" | "paid" | "cancelled";
  payment_method: string;
  receivable_installments_count: number;
  receivable_first_due_days: number;
  receivable_interval_days: number;
  subtotal: number;
  discount_amount: number;
  freight: number;
  tax_amount: number;
  total: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  code: string;
  name: string;
  unit: "UN" | "KG" | "TON";
  quantity: number;
  unit_price: number;
  line_total: number;
  position: number;
};

const toNumber = (value: number | string | null | undefined): number => Number(value ?? 0);

const normalizePaymentMethod = (value: string): OrderPaymentMethod => {
  if (value === "a_vista" || value === "boleto" || value === "pix" || value === "cartao_credito") {
    return value;
  }

  return "boleto";
};

const orderColumns =
  "id,workspace_id,order_number,issue_date,company_id,client_id,source_quote_id,status,payment_method,receivable_installments_count,receivable_first_due_days,receivable_interval_days,subtotal,discount_amount,freight,tax_amount,total,notes,created_at,updated_at";
const companyColumns = "id,workspace_id,name,document,state_registration,phone,address,zip_code,city,state,logo_url";
const clientColumns = "id,workspace_id,name,document,state_registration,phone,address,zip_code,city,state";
const itemColumns = "id,order_id,code,name,unit,quantity,unit_price,line_total,position";

const mapParty = (row: PartyRow) => ({
  id: row.id,
  name: row.name,
  document: row.document,
  stateRegistration: row.state_registration,
  phone: row.phone,
  address: row.address,
  zipCode: row.zip_code,
  city: row.city,
  state: row.state,
  logoDataUrl: row.logo_url ?? "",
});

const getWorkspaceSupabase = async (): Promise<{
  supabase: DbClient;
  workspaceId: string;
  roles: Array<"owner" | "admin" | "operator" | "finance">;
}> => {
  const supabase = await createClient();
  const workspace = await getWorkspaceContext();
  return { supabase, workspaceId: workspace.workspaceId, roles: workspace.roles };
};

const assertOrderEditorRole = (roles: Array<"owner" | "admin" | "operator" | "finance">) => {
  if (!hasAnyRole(roles, ["owner", "admin", "operator"])) {
    throw new ForbiddenError("Apenas Dono/Administrador/Operador podem editar pedidos.");
  }
};

const assertBillingRole = (roles: Array<"owner" | "admin" | "operator" | "finance">) => {
  if (!hasAnyRole(roles, ["owner", "admin", "finance"])) {
    throw new ForbiddenError("Apenas Dono/Administrador/Financeiro podem faturar pedidos.");
  }
};

const recalcTotalsFromItems = (
  items: Array<{ quantity: number; unitPrice: number }>,
  current: { discount_amount: number; freight: number; tax_amount: number },
) => {
  const subtotal = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unitPrice), 0);
  const discountAmount = Number(current.discount_amount ?? 0);
  const freight = Number(current.freight ?? 0);
  const taxAmount = Number(current.tax_amount ?? 0);
  const total = subtotal - discountAmount + freight + taxAmount;

  return {
    subtotal,
    discountAmount,
    freight,
    taxAmount,
    total,
  };
};

const buildOrders = async (supabase: DbClient, orderRows: OrderRow[]): Promise<Order[]> => {
  if (orderRows.length === 0) {
    return [];
  }

  const companyIds = [...new Set(orderRows.map((order) => order.company_id))];
  const clientIds = [...new Set(orderRows.map((order) => order.client_id))];
  const orderIds = orderRows.map((order) => order.id);

  const [{ data: companies, error: companiesError }, { data: clients, error: clientsError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from("companies").select(companyColumns).in("id", companyIds),
      supabase.from("clients").select(clientColumns).in("id", clientIds),
      supabase.from("order_items").select(itemColumns).in("order_id", orderIds),
    ]);

  if (companiesError) {
    throw new Error(`Falha ao carregar empresas dos pedidos: ${companiesError.message}`);
  }
  if (clientsError) {
    throw new Error(`Falha ao carregar clientes dos pedidos: ${clientsError.message}`);
  }
  if (itemsError) {
    throw new Error(`Falha ao carregar itens dos pedidos: ${itemsError.message}`);
  }

  const companiesById = new Map((companies as PartyRow[]).map((company) => [company.id, company]));
  const clientsById = new Map((clients as PartyRow[]).map((client) => [client.id, client]));
  const itemsByOrderId = new Map<string, OrderItemRow[]>();

  (items as OrderItemRow[]).forEach((item) => {
    const current = itemsByOrderId.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrderId.set(item.order_id, current);
  });

  return orderRows.map((row) => {
    const company = companiesById.get(row.company_id);
    const client = clientsById.get(row.client_id);

    if (!company || !client) {
      throw new Error("Relacionamentos do pedido estao inconsistentes no banco.");
    }

    return {
      id: row.id,
      orderNumber: row.order_number,
      issueDate: row.issue_date,
      status: row.status,
      sourceQuoteId: row.source_quote_id,
      paymentMethod: normalizePaymentMethod(row.payment_method),
      receivableInstallmentsCount: row.receivable_installments_count,
      receivableFirstDueDays: row.receivable_first_due_days,
      receivableIntervalDays: row.receivable_interval_days,
      company: mapParty(company),
      client: mapParty(client),
      items: (itemsByOrderId.get(row.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unit_price),
        })),
      notes: row.notes,
      totals: {
        subtotal: toNumber(row.subtotal),
        discountAmount: toNumber(row.discount_amount),
        freight: toNumber(row.freight),
        taxAmount: toNumber(row.tax_amount),
        total: toNumber(row.total),
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
};

export const orderService = {
  async list(): Promise<Order[]> {
    const { supabase, workspaceId } = await getWorkspaceSupabase();

    const { data, error } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar pedidos: ${error.message}`);
    }

    return buildOrders(supabase, (data as OrderRow[]) ?? []);
  },

  async getById(id: string): Promise<Order | null> {
    const { supabase, workspaceId } = await getWorkspaceSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao carregar pedido: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const [order] = await buildOrders(supabase, [data as OrderRow]);
    return order;
  },

  async update(id: string, input: OrderUpdateInput): Promise<Order> {
    const { supabase, workspaceId, roles } = await getWorkspaceSupabase();
    assertOrderEditorRole(roles);

    const { data: current, error: currentError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`Falha ao carregar pedido para edicao: ${currentError.message}`);
    }

    if (!current) {
      throw new Error("Pedido nao encontrado.");
    }

    if (current.status !== "awaiting_billing") {
      throw new Error("Somente pedidos aguardando faturamento podem ser alterados.");
    }

    const totals = recalcTotalsFromItems(input.items, current);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        issue_date: input.issueDate,
        notes: input.notes,
        payment_method: input.paymentMethod,
        receivable_installments_count: input.receivableInstallmentsCount,
        receivable_first_due_days: input.receivableFirstDueDays,
        receivable_interval_days: input.receivableIntervalDays,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        freight: totals.freight,
        tax_amount: totals.taxAmount,
        total: totals.total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);
    }

    const { error: deleteItemsError } = await supabase.from("order_items").delete().eq("order_id", id);
    if (deleteItemsError) {
      throw new Error(`Falha ao atualizar itens do pedido: ${deleteItemsError.message}`);
    }

    const itemRows = input.items.map((item, index) => ({
      order_id: id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Number(item.quantity) * Number(item.unitPrice),
      position: index,
    }));

    const { error: insertItemsError } = await supabase.from("order_items").insert(itemRows);
    if (insertItemsError) {
      throw new Error(`Falha ao salvar itens do pedido: ${insertItemsError.message}`);
    }

    const [order] = await buildOrders(supabase, [
      {
        ...(current as OrderRow),
        issue_date: input.issueDate,
        notes: input.notes,
        payment_method: input.paymentMethod,
        receivable_installments_count: input.receivableInstallmentsCount,
        receivable_first_due_days: input.receivableFirstDueDays,
        receivable_interval_days: input.receivableIntervalDays,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        updated_at: new Date().toISOString(),
      },
    ]);

    return order;
  },

  async bill(id: string): Promise<Order> {
    const { supabase, workspaceId, roles } = await getWorkspaceSupabase();
    assertBillingRole(roles);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Falha ao carregar pedido para faturar: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Pedido nao encontrado.");
    }

    if (order.status !== "awaiting_billing") {
      throw new Error("Somente pedidos aguardando faturamento podem ser faturados.");
    }

    await financeService.ensureReceivablesFromOrder(order.id);

    const { data: refreshed, error: refreshError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (refreshError) {
      throw new Error(`Falha ao recarregar pedido faturado: ${refreshError.message}`);
    }

    const [mapped] = await buildOrders(supabase, [refreshed as OrderRow]);
    return mapped;
  },

  async reopen(id: string): Promise<Order> {
    const { supabase, workspaceId, roles } = await getWorkspaceSupabase();
    assertBillingRole(roles);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Falha ao carregar pedido para reabertura: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Pedido nao encontrado.");
    }

    await financeService.reopenBilledOrder(order.id);

    const { data: refreshed, error: refreshError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (refreshError) {
      throw new Error(`Falha ao recarregar pedido reaberto: ${refreshError.message}`);
    }

    const [mapped] = await buildOrders(supabase, [refreshed as OrderRow]);
    return mapped;
  },

  async reverseFinance(id: string): Promise<Order> {
    const { supabase, workspaceId, roles } = await getWorkspaceSupabase();
    assertBillingRole(roles);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Falha ao carregar pedido para estorno: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Pedido nao encontrado.");
    }

    await financeService.reverseOrderFinanceTotal(order.id);

    const { data: refreshed, error: refreshError } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (refreshError) {
      throw new Error(`Falha ao recarregar pedido apos estorno: ${refreshError.message}`);
    }

    const [mapped] = await buildOrders(supabase, [refreshed as OrderRow]);
    return mapped;
  },
};
