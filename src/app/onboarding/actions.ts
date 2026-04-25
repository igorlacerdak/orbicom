"use server";

import { redirect } from "next/navigation";

import { settingsSchema } from "@/domain/settings.schema";
import { settingsService } from "@/server/settings-service";

const toNumber = (value: FormDataEntryValue | null, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function saveOnboardingAction(formData: FormData) {
  const payload = settingsSchema.parse({
    companyName: String(formData.get("companyName") ?? ""),
    companyDocument: String(formData.get("companyDocument") ?? ""),
    companyStateRegistration: String(formData.get("companyStateRegistration") ?? ""),
    companyPhone: String(formData.get("companyPhone") ?? ""),
    companyAddress: String(formData.get("companyAddress") ?? ""),
    companyZipCode: String(formData.get("companyZipCode") ?? ""),
    companyCity: String(formData.get("companyCity") ?? ""),
    companyState: String(formData.get("companyState") ?? ""),
    companyLogoUrl: String(formData.get("companyLogoUrl") ?? ""),
    defaultDiscountType: String(formData.get("defaultDiscountType") ?? "fixed"),
    defaultDiscountValue: toNumber(formData.get("defaultDiscountValue"), 0),
    defaultFreight: toNumber(formData.get("defaultFreight"), 0),
    defaultTaxRate: toNumber(formData.get("defaultTaxRate"), 0),
    defaultValidityDays: toNumber(formData.get("defaultValidityDays"), 7),
    defaultNotes: String(formData.get("defaultNotes") ?? ""),
    quotePrefix: String(formData.get("quotePrefix") ?? "ORC").toUpperCase(),
    quoteSequence: toNumber(formData.get("quoteSequence"), 1),
    orderPrefix: String(formData.get("orderPrefix") ?? "PED").toUpperCase(),
    orderSequence: toNumber(formData.get("orderSequence"), 1),
  });

  await settingsService.save(payload);
  redirect("/dashboard");
}
