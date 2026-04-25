import { createClient } from "@/utils/supabase/server";
import { SettingsInput } from "@/domain/settings.schema";
import { UnauthorizedError } from "@/server/errors";

type UserSettings = SettingsInput & {
  onboardingCompletedAt: string | null;
};

const fallbackSettings: UserSettings = {
  companyName: "",
  companyDocument: "",
  companyStateRegistration: "",
  companyPhone: "",
  companyAddress: "",
  companyZipCode: "",
  companyCity: "",
  companyState: "",
  companyLogoUrl: "",
  defaultDiscountType: "fixed",
  defaultDiscountValue: 0,
  defaultFreight: 0,
  defaultTaxRate: 0,
  defaultValidityDays: 7,
  defaultNotes: "",
  quotePrefix: "ORC",
  quoteSequence: 1,
  orderPrefix: "PED",
  orderSequence: 1,
  onboardingCompletedAt: null,
};

const mapRow = (
  row:
    | {
        company_name: string;
        company_document: string;
        company_state_registration: string;
        company_phone: string;
        company_address: string;
        company_zip_code: string;
        company_city: string;
        company_state: string;
        company_logo_url: string | null;
        default_discount_type: "fixed" | "percent";
        default_discount_value: number;
        default_freight: number;
        default_tax_rate: number;
        default_validity_days: number;
        default_notes: string;
        quote_prefix: string;
        quote_sequence: number;
        order_prefix: string;
        order_sequence: number;
        onboarding_completed_at: string | null;
      }
    | null,
): UserSettings => {
  if (!row) {
    return fallbackSettings;
  }

  return {
    companyName: row.company_name,
    companyDocument: row.company_document,
    companyStateRegistration: row.company_state_registration,
    companyPhone: row.company_phone,
    companyAddress: row.company_address,
    companyZipCode: row.company_zip_code,
    companyCity: row.company_city,
    companyState: row.company_state,
    companyLogoUrl: row.company_logo_url ?? "",
    defaultDiscountType: row.default_discount_type,
    defaultDiscountValue: Number(row.default_discount_value),
    defaultFreight: Number(row.default_freight),
    defaultTaxRate: Number(row.default_tax_rate),
    defaultValidityDays: row.default_validity_days,
    defaultNotes: row.default_notes,
    quotePrefix: row.quote_prefix,
    quoteSequence: row.quote_sequence,
    orderPrefix: row.order_prefix,
    orderSequence: row.order_sequence,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
};

const getAuthedSupabase = async () => {
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

const settingsColumns =
  "company_name,company_document,company_state_registration,company_phone,company_address,company_zip_code,company_city,company_state,company_logo_url,default_discount_type,default_discount_value,default_freight,default_tax_rate,default_validity_days,default_notes,quote_prefix,quote_sequence,order_prefix,order_sequence,onboarding_completed_at";

const toPayload = (input: SettingsInput, markCompleted: boolean) => ({
  company_name: input.companyName,
  company_document: input.companyDocument,
  company_state_registration: input.companyStateRegistration,
  company_phone: input.companyPhone,
  company_address: input.companyAddress,
  company_zip_code: input.companyZipCode,
  company_city: input.companyCity,
  company_state: input.companyState,
  company_logo_url: input.companyLogoUrl || null,
  default_discount_type: input.defaultDiscountType,
  default_discount_value: input.defaultDiscountValue,
  default_freight: input.defaultFreight,
  default_tax_rate: input.defaultTaxRate,
  default_validity_days: input.defaultValidityDays,
  default_notes: input.defaultNotes,
  quote_prefix: input.quotePrefix,
  quote_sequence: input.quoteSequence,
  order_prefix: input.orderPrefix,
  order_sequence: input.orderSequence,
  onboarding_completed_at: markCompleted ? new Date().toISOString() : null,
  updated_at: new Date().toISOString(),
});

export const settingsService = {
  async get(): Promise<UserSettings> {
    const { supabase, userId } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("user_settings")
      .select(settingsColumns)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao carregar configuracoes: ${error.message}`);
    }

    return mapRow(data);
  },

  async save(input: SettingsInput): Promise<UserSettings> {
    const { supabase, userId } = await getAuthedSupabase();
    const payload = {
      owner_id: userId,
      ...toPayload(input, true),
    };

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "owner_id" })
      .select(settingsColumns)
      .single();

    if (error) {
      throw new Error(`Falha ao salvar configuracoes: ${error.message}`);
    }

    return mapRow(data);
  },

  async getOnboardingStatus(): Promise<{ completed: boolean }> {
    const settings = await this.get();
    return { completed: Boolean(settings.onboardingCompletedAt) };
  },

  async nextQuoteNumber(): Promise<string> {
    const { supabase, userId } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("user_settings")
      .select("quote_prefix,quote_sequence")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao obter numeracao de orcamentos: ${error.message}`);
    }

    const prefix = data?.quote_prefix || "ORC";
    const sequence = data?.quote_sequence ?? 1;
    const number = `${prefix}-${String(sequence).padStart(4, "0")}`;

    const { error: updateError } = await supabase
      .from("user_settings")
      .upsert(
        {
          owner_id: userId,
          quote_prefix: prefix,
          quote_sequence: sequence + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      );

    if (updateError) {
      throw new Error(`Falha ao atualizar sequencia de orcamentos: ${updateError.message}`);
    }

    return number;
  },

  async nextOrderNumber(): Promise<string> {
    const { supabase, userId } = await getAuthedSupabase();
    const { data, error } = await supabase
      .from("user_settings")
      .select("order_prefix,order_sequence")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao obter numeracao de pedidos: ${error.message}`);
    }

    const prefix = data?.order_prefix || "PED";
    const sequence = data?.order_sequence ?? 1;
    const number = `${prefix}-${String(sequence).padStart(4, "0")}`;

    const { error: updateError } = await supabase
      .from("user_settings")
      .upsert(
        {
          owner_id: userId,
          order_prefix: prefix,
          order_sequence: sequence + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      );

    if (updateError) {
      throw new Error(`Falha ao atualizar sequencia de pedidos: ${updateError.message}`);
    }

    return number;
  },
};

export type { UserSettings };
