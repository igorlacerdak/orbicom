import { Badge } from "@/components/ui/badge";
import { QuoteStatus } from "@/domain/quote.types";

const statusLabel: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  converted: "Convertido",
};

const statusVariant: Record<QuoteStatus, "outline" | "secondary" | "default" | "destructive" | "success"> = {
  draft: "outline",
  sent: "secondary",
  approved: "default",
  rejected: "destructive",
  converted: "success",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
}
