'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { UpsertCatalogItemDialog } from '@/components/catalog/upsert-catalog-item-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InlineError } from '@/components/ui/inline-feedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type CatalogItemInput } from '@/domain/catalog.schema';
import { CatalogItem, CatalogItemType } from '@/domain/catalog.types';
import { formatDateTime } from '@/lib/formatters';
import {
  getQueryMetricsSnapshot,
  recordQueryCacheHit,
  recordQueryFetch,
} from '@/lib/query-metrics';
import { queryKeys } from '@/lib/query-keys';
import { formatSelectValue, selectLabelMaps } from '@/lib/select-labels';

const METRIC_KEY = 'catalog-items';

const buildEndpoint = (filters: {
  q: string;
  type: CatalogItemType | 'all';
  showInactive: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters.q.trim()) {
    params.set('q', filters.q.trim());
  }
  params.set('type', filters.type);
  if (!filters.showInactive) {
    params.set('active', 'true');
  }
  return `/api/catalog/items?${params.toString()}`;
};

const fetchCatalogItems = async (filters: {
  q: string;
  type: CatalogItemType | 'all';
  showInactive: boolean;
}) => {
  recordQueryFetch(METRIC_KEY);
  const response = await fetch(buildEndpoint(filters));
  const body = (await response.json()) as {
    data?: CatalogItem[];
    error?: string;
  };

  if (!response.ok || !body.data) {
    throw new Error(body.error ?? 'Falha ao carregar itens do catalogo.');
  }

  return body.data;
};

const itemMatchesFilters = (
  item: CatalogItem,
  filters: { q: string; type: CatalogItemType | 'all'; showInactive: boolean },
) => {
  const query = filters.q.trim().toLowerCase();
  if (!filters.showInactive && !item.active) {
    return false;
  }

  if (filters.type !== 'all' && item.type !== filters.type) {
    return false;
  }

  if (!query) {
    return true;
  }

  return (
    item.code.toLowerCase().includes(query) ||
    item.name.toLowerCase().includes(query)
  );
};

const upsertItemOnList = (
  list: CatalogItem[] | undefined,
  nextItem: CatalogItem,
  filters: { q: string; type: CatalogItemType | 'all'; showInactive: boolean },
) => {
  const current = list ?? [];
  const withoutItem = current.filter((item) => item.id !== nextItem.id);

  if (!itemMatchesFilters(nextItem, filters)) {
    return withoutItem;
  }

  return [...withoutItem, nextItem].sort(
    (a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name),
  );
};

export function CatalogManager() {
  const hasTrackedCacheHit = useRef(false);
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [type, setType] = useState<CatalogItemType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [toggleError, setToggleError] = useState('');

  const filters = useMemo(() => ({ q, type, showInactive }), [q, showInactive, type]);

  const {
    data: items = [],
    isLoading,
    isFetching,
    isFetchedAfterMount,
    dataUpdatedAt,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.catalogItems(filters),
    queryFn: () => fetchCatalogItems(filters),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (hasTrackedCacheHit.current || isLoading || isFetching || isFetchedAfterMount) {
      return;
    }

    recordQueryCacheHit(METRIC_KEY);
    hasTrackedCacheHit.current = true;
  }, [isFetchedAfterMount, isFetching, isLoading]);

  const metric = getQueryMetricsSnapshot()[METRIC_KEY];

  const applyItemToCatalogCache = (nextItem: CatalogItem) => {
    const cachedEntries = queryClient.getQueriesData<CatalogItem[]>({
      queryKey: ['catalog-items'],
    });

    for (const [queryKey, list] of cachedEntries) {
      const [, cachedQ = '', cachedType = 'all', cachedShowInactive = false] =
        queryKey as [string, string, CatalogItemType | 'all', boolean];

      const cachedFilters = {
        q: cachedQ,
        type: cachedType,
        showInactive: cachedShowInactive,
      };

      queryClient.setQueryData(
        queryKey,
        upsertItemOnList(list, nextItem, cachedFilters),
      );
    }

    if (cachedEntries.length === 0) {
      queryClient.setQueryData<CatalogItem[]>(
        queryKeys.catalogItems(filters),
        (oldData) => upsertItemOnList(oldData, nextItem, filters),
      );
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({
      mode,
      itemId,
      payload,
    }: {
      mode: 'create' | 'edit';
      itemId?: string;
      payload: CatalogItemInput;
    }) => {
      const endpoint =
        mode === 'edit' && itemId
          ? `/api/catalog/items/${itemId}`
          : '/api/catalog/items';
      const response = await fetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        data?: CatalogItem;
        error?: string;
      };
      if (!response.ok || !result.data) {
        throw new Error(result.error ?? 'Falha ao salvar item do catalogo.');
      }

      return result.data;
    },
    onMutate: () => {
      setDialogError('');
    },
    onSuccess: (savedItem) => {
      applyItemToCatalogCache(savedItem);
      setDialogOpen(false);
      setEditingItem(null);
      toast.success(dialogMode === 'edit' ? 'Item atualizado com sucesso.' : 'Item cadastrado com sucesso.');
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error
        ? mutationError.message
        : 'Falha ao salvar item do catalogo.';
      setDialogError(message);
      toast.error(message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await fetch(`/api/catalog/items/${id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });

      const result = (await response.json()) as {
        data?: CatalogItem;
        error?: string;
      };
      if (!response.ok || !result.data) {
        throw new Error(result.error ?? 'Falha ao atualizar status do item.');
      }

      return result.data;
    },
    onMutate: () => {
      setToggleError('');
    },
    onSuccess: (updatedItem) => {
      applyItemToCatalogCache(updatedItem);
      toast.success(updatedItem.active ? 'Item ativado com sucesso.' : 'Item inativado com sucesso.');
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error
        ? mutationError.message
        : 'Falha ao atualizar status do item.';
      setToggleError(message);
      toast.error(message);
    },
  });

  const handleCreate = () => {
    setDialogMode('create');
    setEditingItem(null);
    setDialogError('');
    setDialogOpen(true);
  };

  const handleEdit = (item: CatalogItem) => {
    setDialogMode('edit');
    setEditingItem(item);
    setDialogError('');
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (payload: CatalogItemInput) => {
    await saveMutation.mutateAsync({
      mode: dialogMode,
      itemId: editingItem?.id,
      payload,
    });
  };

  const loading = isLoading || isFetching;
  const loadErrorMessage = loadError instanceof Error ? loadError.message : '';

  return (
    <div className="flex flex-col gap-6">
      <UpsertCatalogItemDialog
        open={dialogOpen}
        mode={dialogMode}
        initialItem={editingItem}
        loading={saveMutation.isPending}
        error={dialogError}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setDialogError('');
          }
        }}
        onSubmit={handleDialogSubmit}
      />

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Itens do catalogo</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                Atualizar agora
              </Button>
              <Button type="button" size="sm" onClick={handleCreate}>
                <Plus data-icon="inline-start" />
                Novo item
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            Atualizado em {dataUpdatedAt ? formatDateTime(dataUpdatedAt) : '--'} ·
            fetches: {metric?.fetches ?? 0} · cache hits: {metric?.cacheHits ?? 0}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 overflow-x-auto">
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              placeholder="Buscar por codigo ou descricao"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select
              value={type}
              onValueChange={(value) => setType(value as CatalogItemType | 'all')}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formatSelectValue(selectLabelMaps.catalogType, 'Tipo')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="product">Produtos</SelectItem>
                  <SelectItem value="service">Servicos</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                id="showInactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked === true)}
              />
              <Label htmlFor="showInactive">Mostrar inativos</Label>
            </div>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Aplicar filtros
            </Button>
          </div>

          {loadErrorMessage ? <InlineError message={loadErrorMessage} compact /> : null}
          {toggleError ? <InlineError message={toggleError} compact /> : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Preco padrao</TableHead>
                <TableHead>Livre</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-14" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading
                ? items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type === 'product' ? 'Produto' : 'Servico'}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.defaultUnitPrice.toFixed(2)}</TableCell>
                      <TableCell>{item.allowCustomDescription ? 'Sim' : 'Nao'}</TableCell>
                      <TableCell>{item.active ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading || saveMutation.isPending}
                            onClick={() => handleEdit(item)}
                          >
                            Editar
                          </Button>
                          {item.code !== '000' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={loading || toggleMutation.isPending}
                              onClick={() =>
                                toggleMutation.mutate({ id: item.id, active: !item.active })
                              }
                            >
                              {item.active ? 'Inativar' : 'Ativar'}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>

          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item encontrado para o filtro aplicado.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
