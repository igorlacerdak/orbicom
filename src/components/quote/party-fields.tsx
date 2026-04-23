import { ChangeEvent } from "react";
import { FieldErrors, UseFormRegister } from "react-hook-form";

import { QuoteFormInput } from "@/domain/quote.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor={`${scope}-name`}>Nome / Razao social</Label>
          <Input id={`${scope}-name`} {...register(textField(scope, "name"))} />
          <p className="text-xs text-destructive">{localErrors?.name?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-document`}>CNPJ/CPF</Label>
          <Input
            id={`${scope}-document`}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            {...register(textField(scope, "document"), applyMask(formatCpfCnpj))}
          />
          <p className="text-xs text-destructive">{localErrors?.document?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-stateRegistration`}>Inscricao estadual</Label>
          <Input id={`${scope}-stateRegistration`} {...register(textField(scope, "stateRegistration"))} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-phone`}>Telefone</Label>
          <Input
            id={`${scope}-phone`}
            inputMode="tel"
            placeholder="(00) 00000-0000"
            {...register(textField(scope, "phone"), applyMask(formatPhoneBr))}
          />
          <p className="text-xs text-destructive">{localErrors?.phone?.message}</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${scope}-address`}>Endereco</Label>
          <Input id={`${scope}-address`} {...register(textField(scope, "address"))} />
          <p className="text-xs text-destructive">{localErrors?.address?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-zipCode`}>CEP</Label>
          <Input
            id={`${scope}-zipCode`}
            inputMode="numeric"
            placeholder="00000-000"
            {...register(textField(scope, "zipCode"), applyMask(formatCep))}
          />
          <p className="text-xs text-destructive">{localErrors?.zipCode?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-city`}>Cidade</Label>
          <Input id={`${scope}-city`} {...register(textField(scope, "city"))} />
          <p className="text-xs text-destructive">{localErrors?.city?.message}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${scope}-state`}>UF</Label>
          <Input
            id={`${scope}-state`}
            maxLength={2}
            placeholder="MG"
            {...register(textField(scope, "state"), applyMask(formatStateCode))}
          />
          <p className="text-xs text-destructive">{localErrors?.state?.message}</p>
        </div>
      </CardContent>
    </Card>
  );
};
