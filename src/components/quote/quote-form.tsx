'use client';

import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, FileDown, ArrowLeft } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { calculateQuoteTotals } from '@/domain/quote.calculations';
import { buildDraftQuote } from '@/domain/quote.defaults';
import { QuoteFormInput, quoteFormSchema } from '@/domain/quote.schema';
import { CatalogItem } from '@/domain/catalog.types';
import { Quote } from '@/domain/quote.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ItemsTable } from '@/components/quote/items-table';
import { LogoUpload } from '@/components/quote/logo-upload';
import { PartyFields } from '@/components/quote/party-fields';
import { QuotePreview } from '@/components/quote/quote-preview';
import { TotalsCard } from '@/components/quote/totals-card';
import { buildDefaultQuoteNotes } from '@/lib/quote-notes';

type QuoteFormProps = {
  initialQuote?: Quote;
  mode: 'create' | 'edit';
  initialCatalogItems?: CatalogItem[];
};

const quoteToFormInput = (quote: Quote): QuoteFormInput => ({
  quoteNumber: quote.quoteNumber,
  issueDate: quote.issueDate.slice(0, 10),
  company: quote.company,
  client: quote.client,
  items: quote.items,
  adjustments: quote.adjustments,
  notes: quote.notes,
});

const buildQuotePayload = (values: QuoteFormInput): QuoteFormInput => ({
  ...values,
  company: {
    ...values.company,
    stateRegistration: values.company.stateRegistration ?? '',
    logoDataUrl: values.company.logoDataUrl ?? '',
  },
  client: {
    ...values.client,
    stateRegistration: values.client.stateRegistration ?? '',
    logoDataUrl: values.client.logoDataUrl ?? '',
  },
  notes: values.notes ?? '',
});

export const QuoteForm = ({ initialQuote, mode, initialCatalogItems = [] }: QuoteFormProps) => {
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [catalogItems] = useState<CatalogItem[]>(initialCatalogItems);

  const initialValues = useMemo<QuoteFormInput>(() => {
    if (initialQuote) {
      return quoteToFormInput(initialQuote);
    }

    const draft = buildDraftQuote(1);
    return quoteToFormInput(draft);
  }, [initialQuote]);

  const form = useForm<QuoteFormInput>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
  });

  const { control, register, handleSubmit, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedData = useWatch({ control });

  const normalizedItems = useMemo(
    () =>
      (watchedData.items ?? []).map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        catalogItemId: item.catalogItemId,
        code: item.code ?? '',
        name: item.name ?? '',
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? 'UN',
      })),
    [watchedData.items],
  );

  const normalizedAdjustments = useMemo(
    () => ({
      discountType:
        watchedData.adjustments?.discountType ??
        initialValues.adjustments.discountType,
      discountValue:
        watchedData.adjustments?.discountValue ??
        initialValues.adjustments.discountValue,
      freight:
        watchedData.adjustments?.freight ?? initialValues.adjustments.freight,
      taxRate:
        watchedData.adjustments?.taxRate ?? initialValues.adjustments.taxRate,
    }),
    [
      initialValues.adjustments.discountType,
      initialValues.adjustments.discountValue,
      initialValues.adjustments.freight,
      initialValues.adjustments.taxRate,
      watchedData.adjustments?.discountType,
      watchedData.adjustments?.discountValue,
      watchedData.adjustments?.freight,
      watchedData.adjustments?.taxRate,
    ],
  );

  const totals = useMemo(
    () => calculateQuoteTotals(normalizedItems, normalizedAdjustments),
    [normalizedAdjustments, normalizedItems],
  );

  const previewData: QuoteFormInput = {
    ...initialValues,
    ...watchedData,
    company: {
      ...initialValues.company,
      ...watchedData.company,
    },
    client: {
      ...initialValues.client,
      ...watchedData.client,
    },
    items: normalizedItems,
    adjustments: normalizedAdjustments,
  };

  const persistQuote = async (values: QuoteFormInput): Promise<Quote> => {
    const payload = buildQuotePayload(values);
    const quoteId = initialQuote?.id;
    const isUpdate = mode === 'edit' || Boolean(quoteId);
    const endpoint = isUpdate ? `/api/quotes/${quoteId}` : '/api/quotes';

    const response = await fetch(endpoint, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { data?: Quote; error?: string };

    if (!response.ok || !body.data) {
      throw new Error(body.error ?? 'Falha ao salvar orcamento.');
    }

    return body.data;
  };

  const onSave = async (values: QuoteFormInput) => {
    try {
      const savedQuote = await persistQuote(values);
      setNotice('Orbicom: orcamento salvo com sucesso.');

      if (mode === 'create') {
        router.push(`/orcamentos/${savedQuote.id}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Falha ao salvar orcamento.');
    }
  };

  const onGeneratePdf = async (values: QuoteFormInput) => {
    setPdfLoading(true);
    try {
      const savedQuote = await persistQuote(values);
      window.open(`/api/quotes/${savedQuote.id}/pdf`, '_blank', 'noopener,noreferrer');
      setNotice('PDF gerado com sucesso.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Falha ao gerar PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const onApplyDefaultNotes = () => {
    setValue('notes', buildDefaultQuoteNotes(totals.total), {
      shouldDirty: true,
      shouldTouch: true,
    });
    setNotice('Observacoes padrao aplicadas com base no total atual.');
  };

  return (
    <form
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-10 pt-6 md:px-8"
      onSubmit={handleSubmit(onSave)}
    >
      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quoteNumber">Numero do orcamento</Label>
            <Input id="quoteNumber" {...register('quoteNumber')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDate">Data de emissao</Label>
            <Input id="issueDate" type="date" {...register('issueDate')} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/orcamentos" className="inline-flex">
            <Button type="button" variant="outline">
              <ArrowLeft />
              Voltar
            </Button>
          </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={formState.isSubmitting || pdfLoading}
              onClick={handleSubmit(onGeneratePdf)}
            >
            <FileDown />
            Gerar PDF
          </Button>
          <Button type="submit" disabled={formState.isSubmitting || pdfLoading}>
            <Save />
            Salvar orcamento
          </Button>
        </div>
      </div>

      {notice ? (
        <Card className="border-emerald-300 bg-emerald-50 text-emerald-900">
          <CardContent className="py-3 text-sm">{notice}</CardContent>
        </Card>
      ) : null}

      <LogoUpload
        logoDataUrl={watchedData.company?.logoDataUrl}
        setValue={setValue}
        register={register}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_320px]">
        <div className="space-y-6 xl:col-span-2">
          <PartyFields
            title="Dados da empresa"
            scope="company"
            register={register}
            errors={formState.errors}
          />
          <PartyFields
            title="Dados do cliente"
            scope="client"
            register={register}
            errors={formState.errors}
          />
        </div>

        <div>
          <QuotePreview quote={previewData} totals={totals} />
        </div>
      </div>

      <ItemsTable
        itemCount={fields.length}
        register={register}
        setValue={setValue}
        items={watchedData.items ?? []}
        catalogItems={catalogItems}
        errors={formState.errors}
        append={append}
        remove={remove}
      />

      <TotalsCard control={control} register={register} totals={totals} />

      <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Observacoes gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onApplyDefaultNotes}
            >
              Aplicar observação padrão
            </Button>
          </div>
          <Textarea
            id="notes"
            rows={12}
            placeholder="Prazos, condicoes comerciais, validade da proposta e observacoes importantes."
            {...register('notes')}
          />
          <p className="text-xs text-muted-foreground">
            Regra de calculo: impostos sao aplicados sobre subtotal - desconto +
            frete.
          </p>
        </CardContent>
      </Card>
    </form>
  );
};
