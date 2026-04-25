import { ChangeEvent } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";

import { QuoteFormInput } from "@/domain/quote.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCep, formatCpfCnpj, formatPhoneBr, formatStateCode } from "@/lib/masks";

type PartyFieldsProps = {
  title: string;
  scope: "company" | "client";
  register: UseFormRegister<QuoteFormInput>;
  errors: FieldErrors<QuoteFormInput>;
};

const textField = (
  scope: PartyFieldsProps["scope"],
  field: keyof QuoteFormInput["company"],
): `company.${keyof QuoteFormInput["company"]}` | `client.${keyof QuoteFormInput["client"]}` =>
  `${scope}.${field}` as
    | `company.${keyof QuoteFormInput["company"]}`
    | `client.${keyof QuoteFormInput["client"]}`;

export const PartyFields = ({ title, scope, register, errors }: PartyFieldsProps) => {
  const localErrors = errors[scope];
  const applyMask = (maskFn: (value: string) => string) => ({
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = maskFn(event.target.value);
    },
  });

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor={`${scope}-name`}>Nome / Razao social</FieldLabel>
            <FieldContent>
              <Input id={`${scope}-name`} {...register(textField(scope, "name"))} />
              <FieldError>{localErrors?.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-document`}>CNPJ/CPF</FieldLabel>
            <FieldContent>
              <Input
                id={`${scope}-document`}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                {...register(textField(scope, "document"), applyMask(formatCpfCnpj))}
              />
              <FieldError>{localErrors?.document?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-stateRegistration`}>Inscricao estadual</FieldLabel>
            <FieldContent>
              <Input id={`${scope}-stateRegistration`} {...register(textField(scope, "stateRegistration"))} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-phone`}>Telefone</FieldLabel>
            <FieldContent>
              <Input
                id={`${scope}-phone`}
                inputMode="tel"
                placeholder="(00) 00000-0000"
                {...register(textField(scope, "phone"), applyMask(formatPhoneBr))}
              />
              <FieldError>{localErrors?.phone?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor={`${scope}-address`}>Endereco</FieldLabel>
            <FieldContent>
              <Input id={`${scope}-address`} {...register(textField(scope, "address"))} />
              <FieldError>{localErrors?.address?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-zipCode`}>CEP</FieldLabel>
            <FieldContent>
              <Input
                id={`${scope}-zipCode`}
                inputMode="numeric"
                placeholder="00000-000"
                {...register(textField(scope, "zipCode"), applyMask(formatCep))}
              />
              <FieldError>{localErrors?.zipCode?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-city`}>Cidade</FieldLabel>
            <FieldContent>
              <Input id={`${scope}-city`} {...register(textField(scope, "city"))} />
              <FieldError>{localErrors?.city?.message}</FieldError>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${scope}-state`}>UF</FieldLabel>
            <FieldContent>
              <Input
                id={`${scope}-state`}
                maxLength={2}
                placeholder="MG"
                {...register(textField(scope, "state"), applyMask(formatStateCode))}
              />
              <FieldError>{localErrors?.state?.message}</FieldError>
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};
