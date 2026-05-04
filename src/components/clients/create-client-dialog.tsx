"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ClientAddressFields } from "@/components/clients/client-address-fields";
import { ClientDataFields } from "@/components/clients/client-data-fields";
import {
  ClientDialogTabs,
  type ClientDialogTab,
} from "@/components/clients/client-dialog-tabs";
import {
  defaultClientValues,
  getClientFormValues,
} from "@/components/clients/client-form-values";
import { useClientCepLookup } from "@/components/clients/use-client-cep-lookup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineError, InlineInfo } from "@/components/ui/inline-feedback";
import { clientSchema, type ClientInput } from "@/domain/client.schema";
import type { ClientSummary } from "@/server/client-service";

type CreateClientDialogProps = {
  open: boolean;
  mode?: "create" | "edit";
  initialClient?: ClientSummary | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ClientInput) => Promise<void>;
  loading: boolean;
  error?: string;
};

export function CreateClientDialog({
  open,
  mode = "create",
  initialClient = null,
  onOpenChange,
  onSubmit,
  loading,
  error,
}: CreateClientDialogProps) {
  const [activeTab, setActiveTab] = useState<ClientDialogTab>("dados");
  const [submitFeedback, setSubmitFeedback] = useState("");
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: getClientFormValues(initialClient),
    mode: "onTouched",
  });
  const {
    isCepLoading,
    cepLookupError,
    cepLookupSuccess,
    handleLookupCep,
    clearAddressFields,
    resetCepLookup,
  } = useClientCepLookup(form);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(getClientFormValues(initialClient));
    resetCepLookup(initialClient?.address.zipCode);
  }, [form, initialClient, open, resetCepLookup]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab("dados");
      setSubmitFeedback("");
      resetCepLookup();
    }

    onOpenChange(nextOpen);
  };

  const handleInvalidSubmit = (errors: FieldErrors<ClientInput>) => {
    setSubmitFeedback(
      "Existem campos obrigatorios pendentes. Revise as abas destacadas.",
    );
    setActiveTab(errors.address ? "endereco" : "dados");
    toast.error("Revise os campos obrigatorios para salvar o cliente.");
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitFeedback("");
    await onSubmit(values);
    form.reset(defaultClientValues);
    setActiveTab("dados");
    resetCepLookup();
    handleOpenChange(false);
  }, handleInvalidSubmit);

  const hasDadosErrors = Boolean(
    form.formState.errors.name ||
      form.formState.errors.document ||
      form.formState.errors.phone,
  );
  const hasEnderecoErrors = Boolean(form.formState.errors.address);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize os dados comerciais e endereco principal do cliente."
              : "Preencha os dados comerciais para cadastrar o cliente no workspace atual."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
        >
          <ClientDialogTabs
            activeTab={activeTab}
            hasDadosErrors={hasDadosErrors}
            hasEnderecoErrors={hasEnderecoErrors}
            onTabChange={setActiveTab}
          />

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {activeTab === "dados" ? (
              <ClientDataFields form={form} />
            ) : (
              <ClientAddressFields
                form={form}
                isCepLoading={isCepLoading}
                onLookupCep={handleLookupCep}
              />
            )}

            {error ? (
              <InlineError message={error} compact className="mt-4" />
            ) : null}
            {submitFeedback ? (
              <InlineError message={submitFeedback} compact className="mt-3" />
            ) : null}
            {cepLookupError ? (
              <InlineError message={cepLookupError} compact className="mt-3" />
            ) : null}
            {cepLookupSuccess ? (
              <InlineInfo message={cepLookupSuccess} compact className="mt-3" />
            ) : null}
            {isCepLoading ? (
              <InlineInfo
                message="Consultando dados do CEP para preencher o endereco..."
                compact
                className="mt-3"
              />
            ) : null}
          </div>

          <DialogFooter className="bg-muted/0">
            <Button
              type="button"
              variant="ghost"
              onClick={clearAddressFields}
              disabled={loading || form.formState.isSubmitting}
            >
              Limpar dados
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || form.formState.isSubmitting}
            >
              {loading
                ? "Salvando..."
                : mode === "edit"
                  ? "Atualizar cliente"
                  : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
