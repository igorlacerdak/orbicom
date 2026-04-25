'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

import { CatalogItem, CatalogItemType } from '@/domain/catalog.types';
import { MEASUREMENT_UNITS } from '@/domain/quote.types';
import { QuoteFormInput } from '@/domain/quote.schema';
import { defaultItem } from '@/domain/quote.defaults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSelectValue, selectLabelMaps } from '@/lib/select-labels';

type ItemsTableProps = {
  itemCount: number;
  register: UseFormRegister<QuoteFormInput>;
  setValue: UseFormSetValue<QuoteFormInput>;
  items: Array<Partial<QuoteFormInput['items'][number]>>;
  catalogItems: CatalogItem[];
  errors: FieldErrors<QuoteFormInput>;
  remove: UseFieldArrayRemove;
  append: UseFieldArrayAppend<QuoteFormInput, 'items'>;
};

type PickerFilters = {
  q: string;
  type: CatalogItemType | 'all';
  minPrice: string;
  maxPrice: string;
};

const defaultFilters: PickerFilters = {
  q: '',
  type: 'all',
  minPrice: '',
  maxPrice: '',
};

export const ItemsTable = ({
  itemCount,
  register,
  setValue,
  items,
  catalogItems,
  errors,
  remove,
  append,
}: ItemsTableProps) => {
  const rows = Array.from({ length: itemCount });
  const [pickerRowIndex, setPickerRowIndex] = useState<number | null>(null);
  const [pickerFilters, setPickerFilters] =
    useState<PickerFilters>(defaultFilters);
  const [pickerItems, setPickerItems] = useState<CatalogItem[]>(catalogItems);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');

  const selectedCatalogById = useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems],
  );

  const applyCatalogItem = (index: number, selected: CatalogItem) => {
    setValue(`items.${index}.catalogItemId`, selected.id, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`items.${index}.code`, selected.code, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`items.${index}.name`, selected.name, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`items.${index}.unit`, selected.unit, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`items.${index}.unitPrice`, selected.defaultUnitPrice, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const clearCatalogItem = (index: number) => {
    setValue(`items.${index}.catalogItemId`, undefined, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const openPicker = (index: number) => {
    setPickerRowIndex(index);
    setPickerError('');
    setPickerFilters(defaultFilters);
    setPickerItems(catalogItems);
  };

  const closePicker = () => {
    setPickerRowIndex(null);
    setPickerError('');
  };

  const applyFilters = async () => {
    setPickerLoading(true);
    setPickerError('');

    const params = new URLSearchParams();
    params.set('active', 'true');
    if (pickerFilters.q.trim()) {
      params.set('q', pickerFilters.q.trim());
    }
    if (pickerFilters.type !== 'all') {
      params.set('type', pickerFilters.type);
    }
    if (pickerFilters.minPrice.trim()) {
      params.set('minPrice', pickerFilters.minPrice.trim());
    }
    if (pickerFilters.maxPrice.trim()) {
      params.set('maxPrice', pickerFilters.maxPrice.trim());
    }

    const response = await fetch(`/api/catalog/items?${params.toString()}`, {
      cache: 'no-store',
    });
    const body = (await response.json()) as {
      data?: CatalogItem[];
      error?: string;
    };

    if (!response.ok || !body.data) {
      setPickerError(body.error ?? 'Falha ao filtrar catalogo.');
      setPickerLoading(false);
      return;
    }

    setPickerItems(body.data);
    setPickerLoading(false);
  };

  return (
    <>
      <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Produtos e servicos</CardTitle>
          <Button
            type="button"
            variant="outline"
            onClick={() => append(defaultItem())}
          >
            <Plus />
            Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-28">Catalogo</TableHead>
                <TableHead className="min-w-28">Codigo</TableHead>
                <TableHead className="min-w-60">Produto</TableHead>
                <TableHead className="min-w-28">Preco unit.</TableHead>
                <TableHead className="min-w-24">Qtd.</TableHead>
                <TableHead className="min-w-24">Unidade</TableHead>
                <TableHead className="min-w-16 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((_, index) => {
                const selectedCatalogItemId = items?.[index]?.catalogItemId;
                const selectedCatalogItem = selectedCatalogItemId
                  ? selectedCatalogById.get(selectedCatalogItemId)
                  : undefined;
                const disableCode = Boolean(selectedCatalogItem);
                const disableName =
                  Boolean(selectedCatalogItem) &&
                  !selectedCatalogItem?.allowCustomDescription;
                const currentUnit = items?.[index]?.unit ?? 'UN';

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openPicker(index)}
                        >
                          <Search data-icon="inline-start" />
                          Selecionar
                        </Button>
                        {selectedCatalogItem ? (
                          <>
                            <span className="truncate text-xs text-muted-foreground">
                              {selectedCatalogItem.code} -{' '}
                              {selectedCatalogItem.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => clearCatalogItem(index)}
                            >
                              <X />
                            </Button>
                          </>
                        ) : null}
                      </div>
                      <Input
                        type="hidden"
                        {...register(`items.${index}.catalogItemId`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        {...register(`items.${index}.code`)}
                        placeholder="COD-0001"
                        disabled={disableCode}
                      />
                      <p className="mt-1 text-xs text-destructive">
                        {errors.items?.[index]?.code?.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Input
                        {...register(`items.${index}.name`)}
                        placeholder="Nome do produto"
                        disabled={disableName}
                      />
                      <p className="mt-1 text-xs text-destructive">
                        {errors.items?.[index]?.name?.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentUnit}
                        onValueChange={(value) =>
                          setValue(
                            `items.${index}.unit`,
                            value as QuoteFormInput['items'][number]['unit'],
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                            },
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {formatSelectValue(selectLabelMaps.measurementUnit, 'Unidade')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {MEASUREMENT_UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="hidden"
                        {...register(`items.${index}.unit`)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="hidden" {...register(`items.${index}.id`)} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={itemCount <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <p className="text-xs text-destructive">{errors.items?.message}</p>
        </CardContent>
      </Card>

      <Dialog
        open={pickerRowIndex !== null}
        onOpenChange={(open) => (!open ? closePicker() : null)}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Selecionar produto ou servico</DialogTitle>
            <DialogDescription>
              Filtre por tipo, descricao e faixa de valor para localizar
              rapidamente no catalogo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 md:grid-cols-5">
            <Input
              placeholder="Descricao ou codigo"
              value={pickerFilters.q}
              onChange={(e) =>
                setPickerFilters((prev) => ({ ...prev, q: e.target.value }))
              }
            />
            <Select
              value={pickerFilters.type}
              onValueChange={(value) =>
                setPickerFilters((prev) => ({
                  ...prev,
                  type: value as CatalogItemType | 'all',
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formatSelectValue(selectLabelMaps.catalogType, 'Tipo')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="service">Servico</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor minimo"
              value={pickerFilters.minPrice}
              onChange={(e) =>
                setPickerFilters((prev) => ({
                  ...prev,
                  minPrice: e.target.value,
                }))
              }
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor maximo"
              value={pickerFilters.maxPrice}
              onChange={(e) =>
                setPickerFilters((prev) => ({
                  ...prev,
                  maxPrice: e.target.value,
                }))
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyFilters}
              disabled={pickerLoading}
            >
              Aplicar
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead className="text-right">Selecionar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickerLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`picker-skeleton-${index}`}>
                        <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  : null}
                {!pickerLoading ? pickerItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.type === 'product' ? 'Produto' : 'Servico'}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.defaultUnitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (pickerRowIndex === null) return;
                          applyCatalogItem(pickerRowIndex, item);
                          closePicker();
                        }}
                      >
                        Usar item
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : null}
              </TableBody>
            </Table>
          </div>

          {pickerError ? (
            <p className="text-xs text-destructive">{pickerError}</p>
          ) : null}
          {!pickerLoading && pickerItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum item encontrado com os filtros atuais.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
