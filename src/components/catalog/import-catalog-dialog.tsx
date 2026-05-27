"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/inline-feedback";
import type { CatalogImportItemInput } from "@/domain/catalog.schema";

type ImportCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

type ImportRow = Record<string, unknown>;

const templateRows = [
  ["codigo", "descricao", "tipo", "unidade", "preco_padrao", "descricao_livre", "ativo"],
  ["PROD-001", "Produto exemplo", "produto", "UN", 99.9, "nao", "sim"],
  ["", "Servico sem codigo automatico", "servico", "UN", 150, "sim", "sim"],
];

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const getValue = (row: ImportRow, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }

  return "";
};

const parseMoney = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseBoolean = (value: string, fallback: boolean) => {
  const normalized = normalizeHeader(value);
  if (["sim", "s", "true", "1", "ativo", "yes"].includes(normalized)) return true;
  if (["nao", "n", "false", "0", "inativo", "no"].includes(normalized)) return false;
  return fallback;
};

const parseType = (value: string): CatalogImportItemInput["type"] => {
  const normalized = normalizeHeader(value);
  return normalized === "servico" || normalized === "service" ? "service" : "product";
};

const parseUnit = (value: string): CatalogImportItemInput["unit"] => {
  const normalized = value.trim().toUpperCase();
  return normalized === "KG" || normalized === "TON" ? normalized : "UN";
};

const normalizeRows = (rows: ImportRow[]): CatalogImportItemInput[] =>
  rows
    .map<CatalogImportItemInput | null>((rawRow) => {
      const row = Object.fromEntries(
        Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value]),
      );
      const name = getValue(row, ["descricao", "descricao_do_item", "produto", "nome", "item"]);

      if (!name) {
        return null;
      }

      return {
        code: getValue(row, ["codigo", "cod", "sku"]),
        name,
        type: parseType(getValue(row, ["tipo"])),
        unit: parseUnit(getValue(row, ["unidade", "un"])),
        defaultUnitPrice: parseMoney(getValue(row, ["preco_padrao", "preco", "valor", "valor_unitario"])),
        allowCustomDescription: parseBoolean(getValue(row, ["descricao_livre", "permite_descricao_livre"]), false),
        active: parseBoolean(getValue(row, ["ativo", "status"]), true),
      } satisfies CatalogImportItemInput;
    })
    .filter((item): item is CatalogImportItemInput => Boolean(item));

const chunkItems = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export function ImportCatalogDialog({
  open,
  onOpenChange,
  onImported,
}: ImportCatalogDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(templateRows) as Record<string, unknown>;
    sheet["!cols"] = [
      { wch: 16 },
      { wch: 34 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "produtos");
    XLSX.writeFile(workbook, "modelo-importacao-catalogo.xlsx");
  };

  const handleImportFile = async (file: File) => {
    setError("");
    setIsImporting(true);
    const toastId = toast.loading("Importando catalogo...", {
      duration: Number.POSITIVE_INFINITY,
    });

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error("A planilha nao possui abas para importar.");
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as ImportRow[];
      const items = normalizeRows(rows);

      if (items.length === 0) {
        throw new Error("Nenhum produto valido encontrado no arquivo.");
      }

      let imported = 0;
      const chunks = chunkItems(items, 100);

      for (const [index, chunk] of chunks.entries()) {
        toast.loading(`Importando lote ${index + 1}/${chunks.length}...`, {
          id: toastId,
          duration: Number.POSITIVE_INFINITY,
        });

        const response = await fetch("/api/catalog/items/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: chunk }),
        });
        const body = (await response.json()) as {
          data?: { imported: number };
          error?: string;
        };

        if (!response.ok || !body.data) {
          throw new Error(body.error ?? "Falha ao importar lote do catalogo.");
        }

        imported += body.data.imported;
      }

      toast.success(`${imported} item(ns) importado(s) para o catalogo.`, {
        id: toastId,
        duration: 5000,
      });
      onImported();
      onOpenChange(false);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Falha ao importar catalogo.";
      setError(message);
      toast.error(message, { id: toastId, duration: 7000 });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar produtos</DialogTitle>
          <DialogDescription>
            Envie uma planilha XLSX com os campos do modelo. Linhas sem codigo recebem um codigo automatico.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
              <Download data-icon="inline-start" />
              Baixar modelo
            </Button>
            <Button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Selecionar arquivo
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleImportFile(file);
              }
            }}
          />

          {error ? <InlineError message={error} compact /> : null}

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            Colunas aceitas: codigo, descricao, tipo, unidade, preco_padrao, descricao_livre e ativo.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
