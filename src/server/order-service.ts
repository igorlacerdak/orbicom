import type { Database } from "@repo/database/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Order } from "@/domain/order.types";
import { UnauthorizedError } from "@/server/errors";
import { createClient } from "@/utils/supabase/server";

type DbClient = SupabaseClient<Database>;

type PartyRow = {
  id: string;
  owner_id: string;
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
  owner_id: string;
  order_number: string;
  issue_date: string;
  company_id: string;
  client_id: string;
  source_quote_id: string | null;
  status: "open" | "processing" | "completed" | "cancelled";
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

const orderColumns =
  "id,owner_id,order_number,issue_date,company_id,client_id,source_quote_id,status,subtotal,discount_amount,freight,tax_amount,total,notes,created_at,updated_at";
const companyColumns = "id,owner_id,name,document,state_registration,phone,address,zip_code,city,state,logo_url";
const clientColumns = "id,owner_id,name,document,state_registration,phone,address,zip_code,city,state";
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

const getAuthedSupabase = async (): Promise<{ supabase: DbClient; userId: string }> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return { supabase, userId: user.id };
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
    const { supabase, userId } = await getAuthedSupabase();

    const { data, error } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar pedidos: ${error.message}`);
    }

    return buildOrders(supabase, (data as OrderRow[]) ?? []);
  },

  async getById(id: string): Promise<Order | null> {
    const { supabase, userId } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select(orderColumns)
      .eq("id", id)
      .eq("owner_id", userId)
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
};
