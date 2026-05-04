"use client";

import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ClientInput } from "@/domain/client.schema";
import { formatCpfCnpj, formatPhoneBr } from "@/lib/masks";

type ClientDataFieldsProps = {
  form: UseFormReturn<ClientInput>;
};

const applyMask = (maskFn: (value: string) => string) => ({
  onChange: (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = maskFn(event.target.value);
  },
});

export function ClientDataFields({ form }: ClientDataFieldsProps) {
  return (
    <FieldGroup key="tab-dados" className="grid gap-4 md:grid-cols-2 pb-1">
      <Field className="md:col-span-2">
        <FieldLabel htmlFor="client-name">Nome / Razao social</FieldLabel>
        <FieldContent>
          <Input id="client-name" autoComplete="name" {...form.register("name")} />
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-document">CPF/CNPJ</FieldLabel>
        <FieldContent>
          <Input
            id="client-document"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00.000.000/0000-00"
            {...form.register("document", applyMask(formatCpfCnpj))}
          />
          <FieldError>{form.formState.errors.document?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-state-registration">
          Inscricao estadual
        </FieldLabel>
        <FieldContent>
          <Input
            id="client-state-registration"
            autoComplete="off"
            {...form.register("stateRegistration")}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
        <FieldContent>
          <Input
            id="client-phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            {...form.register("phone", applyMask(formatPhoneBr))}
          />
          <FieldError>{form.formState.errors.phone?.message}</FieldError>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
