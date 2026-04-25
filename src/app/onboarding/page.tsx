import { saveOnboardingAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatSelectValue, selectLabelMaps } from "@/lib/select-labels";
import { settingsService } from "@/server/settings-service";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const settings = await settingsService.get();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 size-52 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Onboarding comercial</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Configure sua empresa, padroes comerciais e numeracao para iniciar operacoes no Orbicom.
          </p>
        </div>
      </section>

      <form action={saveOnboardingAction} className="grid gap-6">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
            <CardDescription>Informacoes que aparecem por padrao nas propostas.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="companyName">Razao social</FieldLabel>
                <FieldContent>
                  <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyDocument">Documento</FieldLabel>
                <FieldContent>
                  <Input id="companyDocument" name="companyDocument" defaultValue={settings.companyDocument} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyStateRegistration">Inscricao estadual</FieldLabel>
                <FieldContent>
                  <Input id="companyStateRegistration" name="companyStateRegistration" defaultValue={settings.companyStateRegistration} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyPhone">Telefone</FieldLabel>
                <FieldContent>
                  <Input id="companyPhone" name="companyPhone" defaultValue={settings.companyPhone} required />
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="companyAddress">Endereco</FieldLabel>
                <FieldContent>
                  <Input id="companyAddress" name="companyAddress" defaultValue={settings.companyAddress} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyZipCode">CEP</FieldLabel>
                <FieldContent>
                  <Input id="companyZipCode" name="companyZipCode" defaultValue={settings.companyZipCode} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyCity">Cidade</FieldLabel>
                <FieldContent>
                  <Input id="companyCity" name="companyCity" defaultValue={settings.companyCity} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyState">Estado</FieldLabel>
                <FieldContent>
                  <Input id="companyState" name="companyState" defaultValue={settings.companyState} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="companyLogoUrl">Logo (URL/base64)</FieldLabel>
                <FieldContent>
                  <Input id="companyLogoUrl" name="companyLogoUrl" defaultValue={settings.companyLogoUrl} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Padroes comerciais</CardTitle>
            <CardDescription>Valores padrao aplicados em novos orcamentos.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="defaultDiscountType">Tipo de desconto</FieldLabel>
                <FieldContent>
                  <Select name="defaultDiscountType" defaultValue={settings.defaultDiscountType}>
                    <SelectTrigger id="defaultDiscountType" className="w-full">
                      <SelectValue>
                        {formatSelectValue(selectLabelMaps.discountType, "Selecione o tipo")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="fixed">Fixo</SelectItem>
                        <SelectItem value="percent">Percentual</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="defaultDiscountValue">Desconto padrao</FieldLabel>
                <FieldContent>
                  <Input id="defaultDiscountValue" name="defaultDiscountValue" type="number" min="0" step="0.01" defaultValue={settings.defaultDiscountValue} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="defaultFreight">Frete padrao</FieldLabel>
                <FieldContent>
                  <Input id="defaultFreight" name="defaultFreight" type="number" min="0" step="0.01" defaultValue={settings.defaultFreight} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="defaultTaxRate">Aliquota de imposto (%)</FieldLabel>
                <FieldContent>
                  <Input id="defaultTaxRate" name="defaultTaxRate" type="number" min="0" step="0.01" defaultValue={settings.defaultTaxRate} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="defaultValidityDays">Validade padrao (dias)</FieldLabel>
                <FieldContent>
                  <Input id="defaultValidityDays" name="defaultValidityDays" type="number" min="1" step="1" defaultValue={settings.defaultValidityDays} />
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="defaultNotes">Observacoes padrao</FieldLabel>
                <FieldContent>
                  <Textarea id="defaultNotes" name="defaultNotes" rows={5} defaultValue={settings.defaultNotes} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Numeracao automatica</CardTitle>
            <CardDescription>Prefixos e sequencias iniciais de orcamentos e pedidos.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="quotePrefix">Prefixo de orcamento</FieldLabel>
                <FieldContent>
                  <Input id="quotePrefix" name="quotePrefix" defaultValue={settings.quotePrefix} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="quoteSequence">Proxima sequencia de orcamento</FieldLabel>
                <FieldContent>
                  <Input id="quoteSequence" name="quoteSequence" type="number" min="1" step="1" defaultValue={settings.quoteSequence} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="orderPrefix">Prefixo de pedido</FieldLabel>
                <FieldContent>
                  <Input id="orderPrefix" name="orderPrefix" defaultValue={settings.orderPrefix} required />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="orderSequence">Proxima sequencia de pedido</FieldLabel>
                <FieldContent>
                  <Input id="orderSequence" name="orderSequence" type="number" min="1" step="1" defaultValue={settings.orderSequence} required />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Salvar e continuar</Button>
        </div>
      </form>
    </main>
  );
}
