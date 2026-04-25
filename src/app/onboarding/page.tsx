import { saveOnboardingAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="relative z-10">
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
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Razao social</Label>
              <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDocument">Documento</Label>
              <Input id="companyDocument" name="companyDocument" defaultValue={settings.companyDocument} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyStateRegistration">Inscricao estadual</Label>
              <Input id="companyStateRegistration" name="companyStateRegistration" defaultValue={settings.companyStateRegistration} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Telefone</Label>
              <Input id="companyPhone" name="companyPhone" defaultValue={settings.companyPhone} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyAddress">Endereco</Label>
              <Input id="companyAddress" name="companyAddress" defaultValue={settings.companyAddress} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyZipCode">CEP</Label>
              <Input id="companyZipCode" name="companyZipCode" defaultValue={settings.companyZipCode} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">Cidade</Label>
              <Input id="companyCity" name="companyCity" defaultValue={settings.companyCity} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyState">Estado</Label>
              <Input id="companyState" name="companyState" defaultValue={settings.companyState} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyLogoUrl">Logo (URL/base64)</Label>
              <Input id="companyLogoUrl" name="companyLogoUrl" defaultValue={settings.companyLogoUrl} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Padroes comerciais</CardTitle>
            <CardDescription>Valores padrao aplicados em novos orcamentos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultDiscountType">Tipo de desconto</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDiscountValue">Desconto padrao</Label>
              <Input id="defaultDiscountValue" name="defaultDiscountValue" type="number" min="0" step="0.01" defaultValue={settings.defaultDiscountValue} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultFreight">Frete padrao</Label>
              <Input id="defaultFreight" name="defaultFreight" type="number" min="0" step="0.01" defaultValue={settings.defaultFreight} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Aliquota de imposto (%)</Label>
              <Input id="defaultTaxRate" name="defaultTaxRate" type="number" min="0" step="0.01" defaultValue={settings.defaultTaxRate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultValidityDays">Validade padrao (dias)</Label>
              <Input id="defaultValidityDays" name="defaultValidityDays" type="number" min="1" step="1" defaultValue={settings.defaultValidityDays} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="defaultNotes">Observacoes padrao</Label>
              <Textarea id="defaultNotes" name="defaultNotes" rows={5} defaultValue={settings.defaultNotes} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Numeracao automatica</CardTitle>
            <CardDescription>Prefixos e sequencias iniciais de orcamentos e pedidos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quotePrefix">Prefixo de orcamento</Label>
              <Input id="quotePrefix" name="quotePrefix" defaultValue={settings.quotePrefix} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quoteSequence">Proxima sequencia de orcamento</Label>
              <Input id="quoteSequence" name="quoteSequence" type="number" min="1" step="1" defaultValue={settings.quoteSequence} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderPrefix">Prefixo de pedido</Label>
              <Input id="orderPrefix" name="orderPrefix" defaultValue={settings.orderPrefix} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderSequence">Proxima sequencia de pedido</Label>
              <Input id="orderSequence" name="orderSequence" type="number" min="1" step="1" defaultValue={settings.orderSequence} required />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Salvar e continuar</Button>
        </div>
      </form>
    </main>
  );
}
