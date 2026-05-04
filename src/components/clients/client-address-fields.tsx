"use client";

import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ClientInput } from "@/domain/client.schema";
import { formatCep, formatStateCode } from "@/lib/masks";

type ClientAddressFieldsProps = {
  form: UseFormReturn<ClientInput>;
  isCepLoading: boolean;
  onLookupCep: (forcedCep?: string) => Promise<void>;
};

const applyMask = (maskFn: (value: string) => string) => ({
  onChange: (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = maskFn(event.target.value);
  },
});

export function ClientAddressFields({
  form,
  isCepLoading,
  onLookupCep,
}: ClientAddressFieldsProps) {
  return (
    <FieldGroup key="tab-endereco" className="grid gap-4 md:grid-cols-2 pb-1">
      <Field>
        <FieldLabel htmlFor="client-zip">CEP</FieldLabel>
        <FieldContent>
          <Input
            id="client-zip"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            {...form.register("address.zipCode", {
              ...applyMask(formatCep),
              onBlur: async () => {
                await onLookupCep();
              },
            })}
          />
          <FieldError>{form.formState.errors.address?.zipCode?.message}</FieldError>
        </FieldContent>
      </Field>

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isCepLoading}
          onClick={() => void onLookupCep()}
        >
          {isCepLoading ? "Buscando CEP..." : "Buscar CEP"}
        </Button>
      </div>

      <Field className="md:col-span-2">
        <FieldLabel htmlFor="client-address">Rua / Endereco</FieldLabel>
        <FieldContent>
          <Input
            id="client-address"
            autoComplete="address-line1"
            {...form.register("address.street")}
          />
          <FieldError>{form.formState.errors.address?.street?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-number">Numero</FieldLabel>
        <FieldContent>
          <Input
            id="client-number"
            autoComplete="off"
            {...form.register("address.number")}
          />
          <FieldError>{form.formState.errors.address?.number?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-complement">Complemento</FieldLabel>
        <FieldContent>
          <Input
            id="client-complement"
            autoComplete="address-line2"
            {...form.register("address.complement")}
          />
        </FieldContent>
      </Field>

      <Field className="md:col-span-2">
        <FieldLabel htmlFor="client-district">Bairro</FieldLabel>
        <FieldContent>
          <Input
            id="client-district"
            autoComplete="address-level3"
            {...form.register("address.district")}
          />
          <FieldError>{form.formState.errors.address?.district?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-city">Cidade</FieldLabel>
        <FieldContent>
          <Input
            id="client-city"
            autoComplete="address-level2"
            {...form.register("address.city")}
          />
          <FieldError>{form.formState.errors.address?.city?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-state">UF</FieldLabel>
        <FieldContent>
          <Input
            id="client-state"
            maxLength={2}
            autoComplete="address-level1"
            placeholder="MG"
            {...form.register("address.state", applyMask(formatStateCode))}
          />
          <FieldError>{form.formState.errors.address?.state?.message}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="client-country">Pais</FieldLabel>
        <FieldContent>
          <Input
            id="client-country"
            autoComplete="country-name"
            {...form.register("address.country")}
          />
          <FieldError>{form.formState.errors.address?.country?.message}</FieldError>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
