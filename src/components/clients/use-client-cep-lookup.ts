"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { ClientInput } from "@/domain/client.schema";

type CepLookupPayload = {
  data?: {
    street: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  };
  error?: string;
};

export const useClientCepLookup = (form: UseFormReturn<ClientInput>) => {
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState("");
  const [cepLookupSuccess, setCepLookupSuccess] = useState("");
  const lastLookupCepRef = useRef("");
  const lastAttemptedCepRef = useRef("");

  const resetCepLookup = useCallback((knownZipCode = "") => {
    const normalized = knownZipCode.replace(/\D/g, "");
    setCepLookupError("");
    setCepLookupSuccess("");
    lastLookupCepRef.current = normalized;
    lastAttemptedCepRef.current = normalized;
  }, []);

  const handleLookupCep = useCallback(
    async (forcedCep?: string) => {
      const zipCode = forcedCep ?? form.getValues("address.zipCode");
      const normalized = zipCode.replace(/\D/g, "");

      if (normalized.length !== 8) {
        return;
      }

      lastAttemptedCepRef.current = normalized;

      setIsCepLoading(true);
      setCepLookupError("");
      setCepLookupSuccess("");

      try {
        const response = await fetch(`/api/cep/${normalized}`);
        const payload = (await response.json()) as CepLookupPayload;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "Falha ao consultar CEP.");
        }

        const current = form.getValues("address");
        form.setValue("address.street", current.street || payload.data.street, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue(
          "address.complement",
          current.complement || payload.data.complement,
          { shouldDirty: true, shouldValidate: true },
        );
        form.setValue(
          "address.district",
          current.district || payload.data.district,
          { shouldDirty: true, shouldValidate: true },
        );
        form.setValue("address.city", current.city || payload.data.city, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue("address.state", current.state || payload.data.state, {
          shouldDirty: true,
          shouldValidate: true,
        });
        lastLookupCepRef.current = normalized;
        setCepLookupSuccess("CEP encontrado e dados aplicados no endereco.");
      } catch (lookupError) {
        setCepLookupError(
          lookupError instanceof Error
            ? lookupError.message
            : "Falha ao consultar CEP.",
        );
      } finally {
        setIsCepLoading(false);
      }
    },
    [form],
  );

  const clearAddressFields = useCallback(() => {
    form.setValue("address.street", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.number", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.complement", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.district", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.zipCode", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.city", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.state", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("address.country", "Brasil", {
      shouldDirty: true,
      shouldValidate: true,
    });
    resetCepLookup();
  }, [form, resetCepLookup]);

  const watchedZipCode = form.watch("address.zipCode");

  useEffect(() => {
    const normalized = (watchedZipCode ?? "").replace(/\D/g, "");

    if (normalized.length !== 8) {
      lastAttemptedCepRef.current = "";
      return;
    }

    if (
      normalized === lastLookupCepRef.current ||
      normalized === lastAttemptedCepRef.current ||
      isCepLoading
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleLookupCep(normalized);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [watchedZipCode, isCepLoading, handleLookupCep]);

  return {
    isCepLoading,
    cepLookupError,
    cepLookupSuccess,
    handleLookupCep,
    clearAddressFields,
    resetCepLookup,
  };
};
