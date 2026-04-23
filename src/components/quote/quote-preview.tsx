import { QuoteFormInput } from "@/domain/quote.schema";
import { QuoteTotals } from "@/domain/quote.types";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuotePreviewProps = {
  quote: QuoteFormInput;
  totals: QuoteTotals;
};

export const QuotePreview = ({ quote, totals }: QuotePreviewProps) => {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Resumo rapido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{quote.quoteNumber}</Badge>
          <Badge variant="outline">{quote.items.length} itens</Badge>
        </div>

        <div>
          <p className="font-semibold">Empresa</p>
          <p className="text-muted-foreground">{quote.company.name || "Preencha os dados da empresa"}</p>
        </div>

        <div>
          <p className="font-semibold">Cliente</p>
          <p className="text-muted-foreground">{quote.client.name || "Preencha os dados do cliente"}</p>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="flex items-center justify-between">
            <span>Total final</span>
            <strong className="text-primary">{formatCurrency(totals.total)}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
