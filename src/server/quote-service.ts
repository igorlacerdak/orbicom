import type { Database } from "@repo/database/types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateItemTotal, calculateQuoteTotals } from "@/domain/quote.calculations";
import { defaultClient, defaultCompany } from "@/domain/quote.defaults";
import { QuoteFormInput } from "@/domain/quote.schema";
import { Quote } from "@/domain/quote.types";
import { buildDefaultQuoteNotes } from "@/lib/quote-notes";
import { createClient } from "@/utils/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Nao autenticado.");
    this.name = "UnauthorizedError";
  }
}

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

type QuoteRow = {
  id: string;
  owner_id: string;
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
  created_at: string;
  updated_at: string;
};

type QuoteItemRow = {
  id: string;
  code: string;
  name: string;
  unit: "UN" | "KG" | "TON";
  quantity: number;
  unit_price: number;
  line_total: number;
  position: number;
  quote_id: string;
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
  "id,owner_id,quote_number,issue_date,company_id,client_id,discount_type,discount_value,freight,tax_rate,subtotal,discount_amount,tax_amount,total,notes,created_at,updated_at";

const companyColumns = "id,owner_id,name,document,state_registration,phone,address,zip_code,city,state,logo_url";

const clientColumns = "id,owner_id,name,document,state_registration,phone,address,zip_code,city,state";

const quoteItemColumns = "id,quote_id,code,name,unit,quantity,unit_price,line_total,position";

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

const upsertCompany = async (supabase: DbClient, userId: string, company: QuoteFormInput["company"]) => {
  const payload = {
    owner_id: userId,
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
    .upsert(payload, { onConflict: "owner_id,document" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar empresa: ${error.message}`);
  }

  return data.id;
};

const upsertClient = async (supabase: DbClient, userId: string, client: QuoteFormInput["client"]) => {
  const payload = {
    owner_id: userId,
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
    .upsert(payload, { onConflict: "owner_id,document" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar cliente: ${error.message}`);
  }

  return data.id;
};

const nextQuoteNumber = async (supabase: DbClient, userId: string) => {
  const year = new Date().getFullYear();

  const { data, error } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("owner_id", userId)
    .like("quote_number", `ORC-${year}-%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao gerar numero do orcamento: ${error.message}`);
  }

  const latest = data?.quote_number;
  const lastIndex = latest ? Number(latest.split("-")[2] ?? 0) : 0;
  const nextIndex = Number.isFinite(lastIndex) ? lastIndex + 1 : 1;

  return `ORC-${year}-${String(nextIndex).padStart(4, "0")}`;
};

const hydrateQuote = async (supabase: DbClient, userId: string, quoteId: string): Promise<Quote> => {
  const { data, error } = await supabase
    .from("quotes")
    .select(quoteColumns)
    .eq("id", quoteId)
    .eq("owner_id", userId)
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

export const quoteService = {
  async list(): Promise<Quote[]> {
    const { supabase, userId } = await getAuthedSupabase();

    const { data, error } = await supabase
      .from("quotes")
      .select(quoteColumns)
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar orcamentos: ${error.message}`);
    }

    return buildQuotes(supabase, (data as QuoteRow[]) ?? []);
  },

  async getById(id: string): Promise<Quote | null> {
    const { supabase, userId } = await getAuthedSupabase();

    const { data, error } = await supabase
      .from("quotes")
      .select(quoteColumns)
      .eq("id", id)
      .eq("owner_id", userId)
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
    const { supabase, userId } = await getAuthedSupabase();
    const quoteNumber = await nextQuoteNumber(supabase, userId);
    const now = new Date().toISOString();

    return {
      id: "",
      quoteNumber,
      issueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      company: defaultCompany,
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
        discountType: "fixed",
        discountValue: 0,
        freight: 0,
        taxRate: 0,
      },
      notes: buildDefaultQuoteNotes(0),
      totals: {
        subtotal: 0,
        discountAmount: 0,
        freight: 0,
        taxAmount: 0,
        total: 0,
      },
    };
  },

  async create(payload: QuoteFormInput): Promise<Quote> {
    const { supabase, userId } = await getAuthedSupabase();
    const companyId = await upsertCompany(supabase, userId, payload.company);
    const clientId = await upsertClient(supabase, userId, payload.client);
    const totals = calculateQuoteTotals(payload.items, payload.adjustments);

    const number = payload.quoteNumber || (await nextQuoteNumber(supabase, userId));

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        owner_id: userId,
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
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao criar orcamento: ${error.message}`);
    }

    await persistItems(supabase, data.id, payload.items);
    return hydrateQuote(supabase, userId, data.id);
  },

  async update(quoteId: string, payload: QuoteFormInput): Promise<Quote> {
    const { supabase, userId } = await getAuthedSupabase();
    const companyId = await upsertCompany(supabase, userId, payload.company);
    const clientId = await upsertClient(supabase, userId, payload.client);
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
      .eq("owner_id", userId);

    if (error) {
      throw new Error(`Falha ao atualizar orcamento: ${error.message}`);
    }

    await persistItems(supabase, quoteId, payload.items);
    return hydrateQuote(supabase, userId, quoteId);
  },
};
