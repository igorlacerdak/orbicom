import { CatalogImportItemInput, CatalogItemInput } from "@/domain/catalog.schema";
import { CatalogItem, CatalogItemType } from "@/domain/catalog.types";
import { ForbiddenError } from "@/server/errors";
import { buildIlikeOrFilter } from "@/server/supabase-filters";
import { getWorkspaceContext, hasAnyRole } from "@/server/workspace-context";
import { createClient } from "@/utils/supabase/server";

type CatalogRow = {
  id: string;
  workspace_id: string;
  code: string;
  name: string;
  type: CatalogItemType;
  unit: "UN" | "KG" | "TON";
  default_unit_price: number;
  allow_custom_description: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const columns =
  "id,workspace_id,code,name,type,unit,default_unit_price,allow_custom_description,active,created_at,updated_at";

const mapItem = (row: CatalogRow): CatalogItem => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: row.type,
  unit: row.unit,
  defaultUnitPrice: Number(row.default_unit_price ?? 0),
  allowCustomDescription: row.allow_custom_description,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildImportCode = (index: number) => {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `IMP-${stamp}-${String(index + 1).padStart(4, "0")}-${suffix}`;
};

const getWorkspaceSupabase = async () => {
  const supabase = await createClient();
  const workspace = await getWorkspaceContext();
  return { supabase, workspace };
};

const ensureDefaultCatalogItem = async (
  supabase: Awaited<ReturnType<typeof getWorkspaceSupabase>>["supabase"],
  ownerId: string,
  workspaceId: string,
) => {
  const { error } = await supabase.from("catalog_items").upsert(
    {
      owner_id: ownerId,
      workspace_id: workspaceId,
      code: "000",
      name: "Item personalizado",
      type: "service",
      unit: "UN",
      default_unit_price: 0,
      allow_custom_description: true,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,code" },
  );

  if (error) {
    throw new Error(`Falha ao garantir item padrao do catalogo: ${error.message}`);
  }
};

export const catalogService = {
  async list(filters?: {
    q?: string;
    type?: CatalogItemType | "all";
    active?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<CatalogItem[]> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    await ensureDefaultCatalogItem(supabase, workspace.userId, workspace.workspaceId);

    let query = supabase
      .from("catalog_items")
      .select(columns)
      .eq("workspace_id", workspace.workspaceId)
      .order("code", { ascending: true })
      .order("name", { ascending: true });

    if (filters?.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (typeof filters?.active === "boolean") {
      query = query.eq("active", filters.active);
    }
    if (filters?.q && filters.q.trim()) {
      const q = filters.q.trim();
      query = query.or(buildIlikeOrFilter(["code", "name"], q));
    }
    if (typeof filters?.minPrice === "number" && Number.isFinite(filters.minPrice)) {
      query = query.gte("default_unit_price", filters.minPrice);
    }
    if (typeof filters?.maxPrice === "number" && Number.isFinite(filters.maxPrice)) {
      query = query.lte("default_unit_price", filters.maxPrice);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Falha ao listar catalogo: ${error.message}`);
    }

    return (data as CatalogRow[]).map(mapItem);
  },

  async listForQuote(): Promise<CatalogItem[]> {
    const items = await this.list({ active: true, type: "all" });
    return items;
  },

  async create(input: CatalogItemInput): Promise<CatalogItem> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas owner/admin/operator podem editar o catalogo.");
    }

    const { data, error } = await supabase
      .from("catalog_items")
      .insert({
        owner_id: workspace.userId,
        workspace_id: workspace.workspaceId,
        code: input.code,
        name: input.name,
        type: input.type,
        unit: input.unit,
        default_unit_price: input.defaultUnitPrice,
        allow_custom_description: input.allowCustomDescription,
        active: input.active,
      })
      .select(columns)
      .single();

    if (error) {
      throw new Error(`Falha ao cadastrar item de catalogo: ${error.message}`);
    }

    return mapItem(data as CatalogRow);
  },

  async importBatch(items: CatalogImportItemInput[]): Promise<{
    imported: number;
    items: CatalogItem[];
  }> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas owner/admin/operator podem importar o catalogo.");
    }

    const rows = items.map((item, index) => ({
      owner_id: workspace.userId,
      workspace_id: workspace.workspaceId,
      code: item.code?.trim() || buildImportCode(index),
      name: item.name.trim(),
      type: item.type,
      unit: item.unit,
      default_unit_price: item.defaultUnitPrice,
      allow_custom_description: item.allowCustomDescription,
      active: item.active,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("catalog_items")
      .upsert(rows, { onConflict: "workspace_id,code" })
      .select(columns);

    if (error) {
      throw new Error(`Falha ao importar catalogo: ${error.message}`);
    }

    return {
      imported: data?.length ?? 0,
      items: ((data as CatalogRow[] | null) ?? []).map(mapItem),
    };
  },

  async update(id: string, input: CatalogItemInput): Promise<CatalogItem> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas owner/admin/operator podem editar o catalogo.");
    }

    const { data, error } = await supabase
      .from("catalog_items")
      .update({
        code: input.code,
        name: input.name,
        type: input.type,
        unit: input.unit,
        default_unit_price: input.defaultUnitPrice,
        allow_custom_description: input.allowCustomDescription,
        active: input.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId)
      .select(columns)
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar item de catalogo: ${error.message}`);
    }

    return mapItem(data as CatalogRow);
  },

  async setActive(id: string, active: boolean): Promise<CatalogItem> {
    const { supabase, workspace } = await getWorkspaceSupabase();
    if (!hasAnyRole(workspace.roles, ["owner", "admin", "operator"])) {
      throw new ForbiddenError("Apenas owner/admin/operator podem editar o catalogo.");
    }

    const { data, error } = await supabase
      .from("catalog_items")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId)
      .select(columns)
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar status do item de catalogo: ${error.message}`);
    }

    return mapItem(data as CatalogRow);
  },
};
