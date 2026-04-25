'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CatalogItem, CatalogItemType } from '@/domain/catalog.types';
import { MEASUREMENT_UNITS } from '@/domain/quote.types';
import { formatSelectValue, selectLabelMaps } from '@/lib/select-labels';

type FormState = {
  id?: string;
  code: string;
  name: string;
  type: CatalogItemType;
  unit: 'UN' | 'KG' | 'TON';
  defaultUnitPrice: number;
  allowCustomDescription: boolean;
  active: boolean;
};

const emptyForm: FormState = {
  code: '',
  name: '',
  type: 'product',
  unit: 'UN',
  defaultUnitPrice: 0,
  allowCustomDescription: false,
  active: true,
};

type CatalogManagerProps = {
  initialItems: CatalogItem[];
};

export function CatalogManager({ initialItems }: CatalogManagerProps) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<CatalogItemType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const buildEndpoint = () => {
    const params = new URLSearchParams();
    if (q.trim()) {
      params.set('q', q.trim());
    }
    params.set('type', type);
    if (!showInactive) {
      params.set('active', 'true');
    }
    return `/api/catalog/items?${params.toString()}`;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const response = await fetch(buildEndpoint(), { cache: 'no-store' });
    const body = (await response.json()) as {
      data?: CatalogItem[];
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? 'Falha ao carregar itens do catalogo.');
      setLoading(false);
      return;
    }

    setItems(body.data);
    setLoading(false);
  };

  const save = async () => {
    setActionLoading(true);
    setError('');
    const payload = {
      code: form.code,
      name: form.name,
      type: form.type,
      unit: form.unit,
      defaultUnitPrice: form.defaultUnitPrice,
      allowCustomDescription: form.allowCustomDescription,
      active: form.active,
    };

    const isEdit = Boolean(form.id);
    const response = await fetch(
      isEdit ? `/api/catalog/items/${form.id}` : '/api/catalog/items',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? 'Falha ao salvar item do catalogo.');
      setActionLoading(false);
      return;
    }

    setForm(emptyForm);
    await load();
    setActionLoading(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    setActionLoading(true);
    const response = await fetch(`/api/catalog/items/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'Falha ao atualizar status do item.');
      setActionLoading(false);
      return;
    }

    await load();
    setActionLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>{form.id ? 'Editar item' : 'Novo item'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Codigo"
            value={form.code}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, code: e.target.value }))
            }
          />
          <Input
            placeholder="Descricao"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, type: value as CatalogItemType }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {formatSelectValue(selectLabelMaps.catalogType, 'Tipo')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="service">Servico</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={form.unit}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, unit: value as FormState['unit'] }))
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
            type="number"
            min="0"
            step="0.01"
            placeholder="Preco padrao"
            value={form.defaultUnitPrice}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                defaultUnitPrice: Number(e.target.value || 0),
              }))
            }
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="allowCustomDescription"
              checked={form.allowCustomDescription}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  allowCustomDescription: checked === true,
                }))
              }
            />
            <Label htmlFor="allowCustomDescription">Permite descricao livre</Label>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="catalogItemActive"
              checked={form.active}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, active: checked === true }))
              }
            />
            <Label htmlFor="catalogItemActive">Ativo</Label>
          </div>

          <div className="md:col-span-4 flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={actionLoading}>
              {actionLoading
                ? form.id
                  ? 'Atualizando...'
                  : 'Cadastrando...'
                : form.id
                  ? 'Atualizar'
                  : 'Cadastrar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(emptyForm)}
              disabled={actionLoading}
            >
              Limpar
            </Button>
          </div>
          {error ? (
            <p className="md:col-span-4 text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Itens do catalogo</CardTitle>
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
              onValueChange={(value) =>
                setType(value as CatalogItemType | 'all')
              }
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
            <Button type="button" variant="outline" onClick={load}>
              Aplicar filtros
            </Button>
          </div>

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
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-28" /></TableCell>
                    </TableRow>
                  ))
                : null}
              {!loading
                ? items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.type === 'product' ? 'Produto' : 'Servico'}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.defaultUnitPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    {item.allowCustomDescription ? 'Sim' : 'Nao'}
                  </TableCell>
                  <TableCell>{item.active ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            code: item.code,
                            name: item.name,
                            type: item.type,
                            unit: item.unit,
                            defaultUnitPrice: item.defaultUnitPrice,
                            allowCustomDescription: item.allowCustomDescription,
                            active: item.active,
                          })
                        }
                      >
                        Editar
                      </Button>
                      {item.code !== '000' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={loading}
                          onClick={() => toggleActive(item.id, !item.active)}
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
