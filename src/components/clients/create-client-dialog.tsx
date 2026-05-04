'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldErrors, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { clientSchema, type ClientInput } from '@/domain/client.schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { InlineError, InlineInfo } from '@/components/ui/inline-feedback';
import { Input } from '@/components/ui/input';
import {
  formatCep,
  formatCpfCnpj,
  formatPhoneBr,
  formatStateCode,
} from '@/lib/masks';

type CreateClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: ClientInput) => Promise<void>;
  loading: boolean;
  error?: string;
};

const defaultValues: ClientInput = {
  name: '',
  document: '',
  stateRegistration: '',
  phone: '',
  address: {
    street: '',
    number: '',
    complement: '',
    district: '',
    zipCode: '',
    city: '',
    state: '',
    country: 'Brasil',
  },
};

export function CreateClientDialog({
  open,
  onOpenChange,
  onCreate,
  loading,
  error,
}: CreateClientDialogProps) {
  const [activeTab, setActiveTab] = useState<'dados' | 'endereco'>('dados');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState('');
  const [cepLookupSuccess, setCepLookupSuccess] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState('');
  const lastLookupCepRef = useRef('');
  const lastAttemptedCepRef = useRef('');
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues,
    mode: 'onTouched',
  });

  const applyMask = (maskFn: (value: string) => string) => ({
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = maskFn(event.target.value);
    },
  });

  const handleInvalidSubmit = (errors: FieldErrors<ClientInput>) => {
    setSubmitFeedback(
      'Existem campos obrigatorios pendentes. Revise as abas destacadas.',
    );
    if (errors.address) {
      setActiveTab('endereco');
    } else {
      setActiveTab('dados');
    }
    toast.error('Revise os campos obrigatorios para salvar o cliente.');
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitFeedback('');
    await onCreate(values);
    form.reset(defaultValues);
    setActiveTab('dados');
    setCepLookupError('');
    setCepLookupSuccess('');
    lastLookupCepRef.current = '';
    lastAttemptedCepRef.current = '';
    onOpenChange(false);
  }, handleInvalidSubmit);

  const hasDadosErrors = Boolean(
    form.formState.errors.name ||
    form.formState.errors.document ||
    form.formState.errors.phone,
  );
  const hasEnderecoErrors = Boolean(form.formState.errors.address);

  const handleLookupCep = useCallback(
    async (forcedCep?: string) => {
      const zipCode = forcedCep ?? form.getValues('address.zipCode');
      const normalized = zipCode.replace(/\D/g, '');

      if (normalized.length !== 8) {
        return;
      }

      lastAttemptedCepRef.current = normalized;

      setIsCepLoading(true);
      setCepLookupError('');
      setCepLookupSuccess('');

      try {
        const response = await fetch(`/api/cep/${normalized}`);
        const payload = (await response.json()) as {
          data?: {
            street: string;
            complement: string;
            district: string;
            city: string;
            state: string;
          };
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? 'Falha ao consultar CEP.');
        }

        const current = form.getValues('address');
        form.setValue('address.street', current.street || payload.data.street, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue(
          'address.complement',
          current.complement || payload.data.complement,
          { shouldDirty: true, shouldValidate: true },
        );
        form.setValue(
          'address.district',
          current.district || payload.data.district,
          { shouldDirty: true, shouldValidate: true },
        );
        form.setValue('address.city', current.city || payload.data.city, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue('address.state', current.state || payload.data.state, {
          shouldDirty: true,
          shouldValidate: true,
        });
        lastLookupCepRef.current = normalized;
        setCepLookupSuccess('CEP encontrado e dados aplicados no endereco.');
      } catch (lookupError) {
        setCepLookupError(
          lookupError instanceof Error
            ? lookupError.message
            : 'Falha ao consultar CEP.',
        );
      } finally {
        setIsCepLoading(false);
      }
    },
    [form],
  );

  const clearAddressFields = () => {
    form.setValue('address.street', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.number', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.complement', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.district', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.zipCode', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.city', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.state', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('address.country', 'Brasil', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setCepLookupError('');
    setCepLookupSuccess('');
    lastLookupCepRef.current = '';
    lastAttemptedCepRef.current = '';
  };

  const watchedZipCode = form.watch('address.zipCode');

  useEffect(() => {
    const normalized = (watchedZipCode ?? '').replace(/\D/g, '');

    if (normalized.length !== 8) {
      lastAttemptedCepRef.current = '';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados comerciais para cadastrar o cliente no workspace
            atual.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
        >
          <div className="inline-flex rounded-lg border border-border p-1">
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'dados' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('dados')}
            >
              Dados{hasDadosErrors ? ' • erro' : ''}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'endereco' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('endereco')}
            >
              Endereco{hasEnderecoErrors ? ' • erro' : ''}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {activeTab === 'dados' ? (
              <FieldGroup
                key="tab-dados"
                className="grid gap-4 md:grid-cols-2 pb-1"
              >
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="client-name">
                    Nome / Razao social
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-name"
                      autoComplete="name"
                      {...form.register('name')}
                    />
                    <FieldError>
                      {form.formState.errors.name?.message}
                    </FieldError>
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
                      {...form.register('document', applyMask(formatCpfCnpj))}
                    />
                    <FieldError>
                      {form.formState.errors.document?.message}
                    </FieldError>
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
                      {...form.register('stateRegistration')}
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
                      {...form.register('phone', applyMask(formatPhoneBr))}
                    />
                    <FieldError>
                      {form.formState.errors.phone?.message}
                    </FieldError>
                  </FieldContent>
                </Field>
              </FieldGroup>
            ) : (
              <FieldGroup
                key="tab-endereco"
                className="grid gap-4 md:grid-cols-2 pb-1"
              >
                <Field>
                  <FieldLabel htmlFor="client-zip">CEP</FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      {...form.register('address.zipCode', {
                        ...applyMask(formatCep),
                        onBlur: async () => {
                          await handleLookupCep();
                        },
                      })}
                    />
                    <FieldError>
                      {form.formState.errors.address?.zipCode?.message}
                    </FieldError>
                  </FieldContent>
                </Field>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCepLoading}
                    onClick={() => void handleLookupCep()}
                  >
                    {isCepLoading ? 'Buscando CEP...' : 'Buscar CEP'}
                  </Button>
                </div>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="client-address">
                    Rua / Endereco
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-address"
                      autoComplete="address-line1"
                      {...form.register('address.street')}
                    />
                    <FieldError>
                      {form.formState.errors.address?.street?.message}
                    </FieldError>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="client-number">Numero</FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-number"
                      autoComplete="off"
                      {...form.register('address.number')}
                    />
                    <FieldError>
                      {form.formState.errors.address?.number?.message}
                    </FieldError>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="client-complement">
                    Complemento
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-complement"
                      autoComplete="address-line2"
                      {...form.register('address.complement')}
                    />
                  </FieldContent>
                </Field>

                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="client-district">Bairro</FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-district"
                      autoComplete="address-level3"
                      {...form.register('address.district')}
                    />
                    <FieldError>
                      {form.formState.errors.address?.district?.message}
                    </FieldError>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="client-city">Cidade</FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-city"
                      autoComplete="address-level2"
                      {...form.register('address.city')}
                    />
                    <FieldError>
                      {form.formState.errors.address?.city?.message}
                    </FieldError>
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
                      {...form.register(
                        'address.state',
                        applyMask(formatStateCode),
                      )}
                    />
                    <FieldError>
                      {form.formState.errors.address?.state?.message}
                    </FieldError>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="client-country">Pais</FieldLabel>
                  <FieldContent>
                    <Input
                      id="client-country"
                      autoComplete="country-name"
                      {...form.register('address.country')}
                    />
                    <FieldError>
                      {form.formState.errors.address?.country?.message}
                    </FieldError>
                  </FieldContent>
                </Field>
              </FieldGroup>
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || form.formState.isSubmitting}
            >
              {loading ? 'Salvando...' : 'Salvar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
