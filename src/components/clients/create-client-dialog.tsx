"use client";

import { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { clientSchema, type ClientInput } from "@/domain/client.schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCep, formatCpfCnpj, formatPhoneBr, formatStateCode } from "@/lib/masks";

type CreateClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: ClientInput) => Promise<void>;
  loading: boolean;
  error?: string;
};

const defaultValues: ClientInput = {
  name: "",
  document: "",
  stateRegistration: "",
  phone: "",
  address: "",
  zipCode: "",
  city: "",
  state: "",
};

export function CreateClientDialog({ open, onOpenChange, onCreate, loading, error }: CreateClientDialogProps) {
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues,
    mode: "onTouched",
  });

  const applyMask = (maskFn: (value: string) => string) => ({
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = maskFn(event.target.value);
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onCreate(values);
    form.reset(defaultValues);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Preencha os dados comerciais para cadastrar o cliente no workspace atual.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="client-name">Nome / Razao social</FieldLabel>
              <FieldContent>
                <Input id="client-name" {...form.register("name")} />
                <FieldError>{form.formState.errors.name?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-document">CPF/CNPJ</FieldLabel>
              <FieldContent>
                <Input
                  id="client-document"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...form.register("document", applyMask(formatCpfCnpj))}
                />
                <FieldError>{form.formState.errors.document?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-state-registration">Inscricao estadual</FieldLabel>
              <FieldContent>
                <Input id="client-state-registration" {...form.register("stateRegistration")} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
              <FieldContent>
                <Input
                  id="client-phone"
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  {...form.register("phone", applyMask(formatPhoneBr))}
                />
                <FieldError>{form.formState.errors.phone?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="client-address">Endereco</FieldLabel>
              <FieldContent>
                <Input id="client-address" {...form.register("address")} />
                <FieldError>{form.formState.errors.address?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-zip">CEP</FieldLabel>
              <FieldContent>
                <Input
                  id="client-zip"
                  inputMode="numeric"
                  placeholder="00000-000"
                  {...form.register("zipCode", applyMask(formatCep))}
                />
                <FieldError>{form.formState.errors.zipCode?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-city">Cidade</FieldLabel>
              <FieldContent>
                <Input id="client-city" {...form.register("city")} />
                <FieldError>{form.formState.errors.city?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-state">UF</FieldLabel>
              <FieldContent>
                <Input id="client-state" maxLength={2} placeholder="MG" {...form.register("state", applyMask(formatStateCode))} />
                <FieldError>{form.formState.errors.state?.message}</FieldError>
              </FieldContent>
            </Field>
          </FieldGroup>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || form.formState.isSubmitting}>
              {loading ? "Salvando..." : "Salvar cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
