import type { Database } from "@repo/database/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateItemTotal, calculateQuoteTotals } from "@/domain/quote.calculations";
import { defaultClient, defaultCompany } from "@/domain/quote.defaults";
import { QuoteFormInput } from "@/domain/quote.schema";
import { Quote, QuoteStatus } from "@/domain/quote.types";
import { buildDefaultQuoteNotes } from "@/lib/quote-notes";
import { ForbiddenError } from "@/server/errors";
import { settingsService } from "@/server/settings-service";
import { getWorkspaceContext, hasAnyRole } from "@/server/workspace-context";
import type { WorkspaceRole } from "@/server/workspace-context";
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

type QuoteRow = {
  id: string;
  workspace_id: string;
  quote_number: string;
  issue_date: string;
  company_id: string;
  client_id: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  freight: number;
  tax_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  notes: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
};

type QuoteItemRow = {
  id: string;
  catalog_item_id: string | null;
  code: string;
  name: string;
  unit: "UN" | "KG" | "TON";
  quantity: number;
  unit_price: number;
  line_total: number;
  position: number;
  quote_id: string;
};

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];

const quoteStatusTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent", "rejected", "approved"],
  sent: ["approved", "rejected", "draft"],
  approved: ["converted", "rejected"],
  rejected: ["draft", "sent"],
  converted: [],
};

const toNumber = (value: number | string | null | undefined): number => Number(value ?? 0);

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

const mapQuote = (
  row: QuoteRow,
  company: PartyRow,
  client: PartyRow,
  items: QuoteItemRow[],
): Quote => ({
  id: row.id,
  status: row.status,
  quoteNumber: row.quote_number,
  issueDate: row.issue_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  company: mapParty(company),
  client: mapParty(client),
  items: items
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      catalogItemId: item.catalog_item_id ?? undefined,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
    })),
  adjustments: {
    discountType: row.discount_type,
    discountValue: toNumber(row.discount_value),
    freight: toNumber(row.freight),
    taxRate: toNumber(row.tax_rate),
  },
  notes: row.notes,
  totals: {
    subtotal: toNumber(row.subtotal),
    discountAmount: toNumber(row.discount_amount),
    freight: toNumber(row.freight),
    taxAmount: toNumber(row.tax_amount),
    total: toNumber(row.total),
  },
});

const quoteColumns =
  "id,workspace_id,quote_number,issue_date,company_id,client_id,discount_type,discount_value,freight,tax_rate,subtotal,discount_amount,tax_amount,total,notes,status,created_at,updated_at";

const companyColumns = "id,workspace_id,name,document,state_registration,phone,address,zip_code,city,state,logo_url";
const clientColumns = "id,workspace_id,name,document,state_registration,phone,address,zip_code,city,state";
const quoteItemColumns = "id,quote_id,catalog_item_id,code,name,unit,quantity,unit_price,line_total,position";

const getWorkspaceSupabase = async (): Promise<{
  supabase: DbClient;
  workspace: { userId: string; workspaceId: string; roles: WorkspaceRole[] };
}> => {
  const supabase = await createClient();
  const workspace = await getWorkspaceContext();
  return { supabase, workspace };
};

const assertEditorRole = (roles: WorkspaceRole[]) => {
  if (!hasAnyRole(roles, ["owner", "admin", "operator"])) {
    throw new ForbiddenError("Apenas owner/admin/operator podem editar orcamentos.");
  }
};

const buildQuotes = async (supabase: DbClient, quoteRows: QuoteRow[]): Promise<Quote[]> => {
  if (quoteRows.length === 0) {
    return [];
  }

  const companyIds = [...new Set(quoteRows.map((quote) => quote.company_id))];
  const clientIds = [...new Set(quoteRows.map((quote) => quote.client_id))];
  const quoteIds = quoteRows.map((quote) => quote.id);

  const [{ data: companies, error: companiesError }, { data: clients, error: clientsError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from("companies").select(companyColumns).in("id", companyIds),
      supabase.from("clients").select(clientColumns).in("id", clientIds),
      supabase.from("quote_items").select(quoteItemColumns).in("quote_id", quoteIds),
    ]);

  if (companiesError) {
    throw new Error(`Falha ao carregar empresas dos orcamentos: ${companiesError.message}`);
  }
  if (clientsError) {
    throw new Error(`Falha ao carregar clientes dos orcamentos: ${clientsError.message}`);
  }
  if (itemsError) {
    throw new Error(`Falha ao carregar itens dos orcamentos: ${itemsError.message}`);
  }

  const companyById = new Map((companies as PartyRow[]).map((company) => [company.id, company]));
  const clientById = new Map((clients as PartyRow[]).map((client) => [client.id, client]));
  const itemsByQuoteId = new Map<string, QuoteItemRow[]>();

  (items as QuoteItemRow[]).forEach((item) => {
    const current = itemsByQuoteId.get(item.quote_id) ?? [];
    current.push(item);
    itemsByQuoteId.set(item.quote_id, current);
  });

  return quoteRows.map((row) => {
    const company = companyById.get(row.company_id);
    const client = clientById.get(row.client_id);

    if (!company || !client) {
      throw new Error("Relacionamentos do orcamento estao inconsistentes no banco.");
    }

    return mapQuote(row, company, client, itemsByQuoteId.get(row.id) ?? []);
  });
};

const upsertCompany = async (
  supabase: DbClient,
  ownerId: string,
  workspaceId: string,
  company: QuoteFormInput["company"],
) => {
  const payload = {
    owner_id: ownerId,
    workspace_id: workspaceId,
    name: company.name,
    document: company.document,
    state_registration: company.stateRegistration,
    phone: company.phone,
    address: company.address,
    zip_code: company.zipCode,
    city: company.city,
    state: company.state,
    logo_url: company.logoDataUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("companies")
    .upsert(payload, { onConflict: "workspace_id,document" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar empresa: ${error.message}`);
  }

  return data.id;
};

const upsertClient = async (
  supabase: DbClient,
  ownerId: string,
  workspaceId: string,
  client: QuoteFormInput["client"],
) => {
  const payload = {
    owner_id: ownerId,
    workspace_id: workspaceId,
    name: client.name,
    document: client.document,
    state_registration: client.stateRegistration,
    phone: client.phone,
    address: client.address,
    zip_code: client.zipCode,
    city: client.city,
    state: client.state,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("clients")
    .upsert(payload, { onConflict: "workspace_id,document" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar cliente: ${error.message}`);
  }

  return data.id;
};

const hydrateQuote = async (supabase: DbClient, workspaceId: string, quoteId: string): Promise<Quote> => {
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteColumns)
    .eq("id", quoteId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) {
    throw new Error("Orcamento nao encontrado.");
  }

  const [quote] = await buildQuotes(supabase, [data as QuoteRow]);
  return quote;
};

const persistItems = async (supabase: DbClient, quoteId: string, items: QuoteFormInput["items"]) => {
  const { error: deleteError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);

  if (deleteError) {
    throw new Error(`Falha ao substituir itens do orcamento: ${deleteError.message}`);
  }

  const rows = items.map((item, index) => ({
    quote_id: quoteId,
    catalog_item_id: item.catalogItemId ?? null,
    code: item.code,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: calculateItemTotal(item),
    position: index,
  }));

  const { error: insertError } = await supabase.from("quote_items").insert(rows);
  if (insertError) {
    throw new Error(`Falha ao salvar itens do orcamento: ${insertError.message}`);
  }
};

const assertTransition = (from: QuoteStatus, to: QuoteStatus) => {
  if (!quoteStatusTransitions[from].includes(to)) {
    throw new Error(`Transicao de status invalida: ${from} -> ${to}.`);
  }
};

const getRowById = async (supabase: DbClient, workspaceId: string, quoteId: string): Promise<QuoteRow> => {
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteColumns)
    .eq("id", quoteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar orcamento: ${error.message}`);
  }

  if (!data) {
    throw new Error("Orcamento nao encontrado.");
  }

  return data as QuoteRow;
};

const convertQuoteToOrder = async (
  supabase: DbClient,
  ownerId: string,
  workspaceId: string,
  quote: QuoteRow,
): Promise<string> => {
  const { data: existingOrder, error: existingError } = await supabase
    .from("orders")
    .select("id")
    .eq("source_quote_id", quote.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Falha ao verificar pedido existente: ${existingError.message}`);
  }

  if (existingOrder) {
    return existingOrder.id;
  }

  const orderNumber = await settingsService.nextOrderNumber();

  const orderPayload: OrderInsert = {
    owner_id: ownerId,
    workspace_id: workspaceId,
    order_number: orderNumber,
    issue_date: quote.issue_date,
    company_id: quote.company_id,
    client_id: quote.client_id,
    source_quote_id: quote.id,
    status: "awaiting_billing",
    payment_method: "boleto",
    receivable_installments_count: 3,
    receivable_first_due_days: 30,
    receivable_interval_days: 30,
    subtotal: quote.subtotal,
    discount_amount: quote.discount_amount,
    freight: quote.freight,
    tax_amount: quote.tax_amount,
    total: quote.total,
    notes: quote.notes,
  };

  const { data: insertedOrder, error: insertOrderError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id")
    .single();

  if (insertOrderError) {
    throw new Error(`Falha ao criar pedido: ${insertOrderError.message}`);
  }

  const { data: quoteItems, error: quoteItemsError } = await supabase
    .from("quote_items")
    .select("code,name,unit,quantity,unit_price,line_total,position")
    .eq("quote_id", quote.id)
    .order("position", { ascending: true });

  if (quoteItemsError) {
    throw new Error(`Falha ao carregar itens para conversao: ${quoteItemsError.message}`);
  }

  const orderItems = (quoteItems ?? []).map((item) => ({
    order_id: insertedOrder.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    position: item.position,
  }));

  if (orderItems.length > 0) {
    const { error: orderItemsError } = await supabase.from("order_items").insert(orderItems);
    if (orderItemsError) {
      throw new Error(`Falha ao salvar itens do pedido: ${orderItemsError.message}`);
    }
  }

  return insertedOrder.id;
};

export const quoteService = {
  async list(): Promise<Quote[]> {
    const { supabase, workspace } = await getWorkspaceSupabase();

    const { data, error } = await supabase
      .from("quotes")
      .select(quoteColumns)
      .eq("workspace_id", workspace.workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar orcamentos: ${error.message}`);
    }

    return buildQuotes(supabase, (data as QuoteRow[]) ?? []);
  },

  async getById(id: string): Promise<Quote | null> {
    const { supabase, workspace } = await getWorkspaceSupabase();

    const { data, error } = await supabase
      .from("quotes")
      .select(quoteColumns)
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao consultar orcamento: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const [quote] = await buildQuotes(supabase, [data as QuoteRow]);
    return quote;
  },

  async createDraft(): Promise<Quote> {
    const { workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const settings = await settingsService.get();
    const now = new Date().toISOString();
    const quoteNumber = `${settings.quotePrefix}-${String(settings.quoteSequence).padStart(4, "0")}`;

    return {
      id: "",
      status: "draft",
      quoteNumber,
      issueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      company: {
        ...defaultCompany,
        name: settings.companyName || defaultCompany.name,
        document: settings.companyDocument || defaultCompany.document,
        stateRegistration: settings.companyStateRegistration || defaultCompany.stateRegistration,
        phone: settings.companyPhone || defaultCompany.phone,
        address: settings.companyAddress || defaultCompany.address,
        zipCode: settings.companyZipCode || defaultCompany.zipCode,
        city: settings.companyCity || defaultCompany.city,
        state: settings.companyState || defaultCompany.state,
        logoDataUrl: settings.companyLogoUrl || defaultCompany.logoDataUrl,
      },
      client: defaultClient,
      items: [
        {
          id: crypto.randomUUID(),
          code: "",
          name: "",
          unitPrice: 0,
          quantity: 1,
          unit: "UN",
        },
      ],
      adjustments: {
        discountType: settings.defaultDiscountType,
        discountValue: settings.defaultDiscountValue,
        freight: settings.defaultFreight,
        taxRate: settings.defaultTaxRate,
      },
      notes: settings.defaultNotes || buildDefaultQuoteNotes(0),
      totals: {
        subtotal: 0,
        discountAmount: 0,
        freight: settings.defaultFreight,
        taxAmount: 0,
        total: settings.defaultFreight,
      },
    };
  },

  async create(payload: QuoteFormInput): Promise<Quote> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const companyId = await upsertCompany(supabase, workspace.userId, workspace.workspaceId, payload.company);
    const clientId = await upsertClient(supabase, workspace.userId, workspace.workspaceId, payload.client);
    const totals = calculateQuoteTotals(payload.items, payload.adjustments);

    const generatedNumber = await settingsService.nextQuoteNumber();
    const number = payload.quoteNumber || generatedNumber;

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        owner_id: workspace.userId,
        workspace_id: workspace.workspaceId,
        quote_number: number,
        issue_date: payload.issueDate,
        company_id: companyId,
        client_id: clientId,
        discount_type: payload.adjustments.discountType,
        discount_value: payload.adjustments.discountValue,
        freight: payload.adjustments.freight,
        tax_rate: payload.adjustments.taxRate,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: payload.notes,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao criar orcamento: ${error.message}`);
    }

    await persistItems(supabase, data.id, payload.items);
    return hydrateQuote(supabase, workspace.workspaceId, data.id);
  },

  async update(quoteId: string, payload: QuoteFormInput): Promise<Quote> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const companyId = await upsertCompany(supabase, workspace.userId, workspace.workspaceId, payload.company);
    const clientId = await upsertClient(supabase, workspace.userId, workspace.workspaceId, payload.client);
    const totals = calculateQuoteTotals(payload.items, payload.adjustments);

    const { error } = await supabase
      .from("quotes")
      .update({
        quote_number: payload.quoteNumber,
        issue_date: payload.issueDate,
        company_id: companyId,
        client_id: clientId,
        discount_type: payload.adjustments.discountType,
        discount_value: payload.adjustments.discountValue,
        freight: payload.adjustments.freight,
        tax_rate: payload.adjustments.taxRate,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("workspace_id", workspace.workspaceId);

    if (error) {
      throw new Error(`Falha ao atualizar orcamento: ${error.message}`);
    }

    await persistItems(supabase, quoteId, payload.items);
    return hydrateQuote(supabase, workspace.workspaceId, quoteId);
  },

  async updateStatus(quoteId: string, status: QuoteStatus): Promise<Quote> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const current = await getRowById(supabase, workspace.workspaceId, quoteId);

    if (current.status !== status) {
      assertTransition(current.status, status);
    }

    const { error } = await supabase
      .from("quotes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", quoteId)
      .eq("workspace_id", workspace.workspaceId);

    if (error) {
      throw new Error(`Falha ao atualizar status: ${error.message}`);
    }

    return hydrateQuote(supabase, workspace.workspaceId, quoteId);
  },

  async convertToOrder(quoteId: string): Promise<{ quote: Quote; orderId: string }> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const current = await getRowById(supabase, workspace.workspaceId, quoteId);

    if (current.status !== "approved" && current.status !== "converted") {
      throw new Error("Apenas orcamentos aprovados podem ser convertidos em pedido.");
    }

    const orderId = await convertQuoteToOrder(supabase, workspace.userId, workspace.workspaceId, current);

    if (current.status !== "converted") {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("id", quoteId)
        .eq("workspace_id", workspace.workspaceId);

      if (error) {
        throw new Error(`Falha ao marcar orcamento como convertido: ${error.message}`);
      }
    }

    return {
      quote: await hydrateQuote(supabase, workspace.workspaceId, quoteId),
      orderId,
    };
  },

  async duplicate(quoteId: string): Promise<Quote> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    assertEditorRole(workspace.roles);

    const current = await getRowById(supabase, workspace.workspaceId, quoteId);

    const { data: sourceItems, error: sourceItemsError } = await supabase
      .from("quote_items")
      .select("catalog_item_id,code,name,unit,quantity,unit_price,line_total,position")
      .eq("quote_id", quoteId)
      .order("position", { ascending: true });

    if (sourceItemsError) {
      throw new Error(`Falha ao carregar itens para duplicacao: ${sourceItemsError.message}`);
    }

    const number = await settingsService.nextQuoteNumber();

    const { data: created, error: createError } = await supabase
      .from("quotes")
      .insert({
        owner_id: workspace.userId,
        workspace_id: workspace.workspaceId,
        quote_number: number,
        issue_date: new Date().toISOString().slice(0, 10),
        company_id: current.company_id,
        client_id: current.client_id,
        discount_type: current.discount_type,
        discount_value: current.discount_value,
        freight: current.freight,
        tax_rate: current.tax_rate,
        subtotal: current.subtotal,
        discount_amount: current.discount_amount,
        tax_amount: current.tax_amount,
        total: current.total,
        notes: current.notes,
        status: "draft",
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Falha ao duplicar orcamento: ${createError.message}`);
    }

    const duplicatedItems = (sourceItems ?? []).map((item) => ({
      quote_id: created.id,
      catalog_item_id: item.catalog_item_id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      position: item.position,
    }));

    if (duplicatedItems.length > 0) {
      const { error: insertItemsError } = await supabase.from("quote_items").insert(duplicatedItems);
      if (insertItemsError) {
        throw new Error(`Falha ao salvar itens duplicados: ${insertItemsError.message}`);
      }
    }

    return hydrateQuote(supabase, workspace.workspaceId, created.id);
  },
};
