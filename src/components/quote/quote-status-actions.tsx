"use client";

import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import { CheckCircle2, CircleSlash2, Copy, Eye, History, MoreHorizontal, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuoteStatus } from "@/domain/quote.types";

type QuoteStatusActionsProps = {
  quoteId: string;
  status: QuoteStatus;
};

const allowedTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent", "approved", "rejected"],
  sent: ["approved", "rejected", "draft"],
  approved: ["converted", "rejected"],
  rejected: ["draft", "sent"],
  converted: [],
};

export function QuoteStatusActions({ quoteId, status }: QuoteStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus>(status);

  const onChangeStatus = async (nextStatus: QuoteStatus) => {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/quotes/${quoteId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const body = (await response.json()) as { data?: { status?: QuoteStatus }; error?: string };

    if (!response.ok) {
      setError(body.error ?? "Falha ao atualizar status.");
    } else {
      setCurrentStatus(body.data?.status ?? nextStatus);
    }

    setLoading(false);
  };

  const onConvert = async () => {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/quotes/${quoteId}/convert`, {
      method: "POST",
    });
    const body = (await response.json()) as { data?: { orderId?: string }; error?: string };

    if (!response.ok) {
      setError(body.error ?? "Falha ao converter em pedido.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (body.data?.orderId) {
      router.push(`/pedidos/${body.data.orderId}`);
    }
  };

  const onDuplicate = async () => {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/quotes/${quoteId}/duplicate`, {
      method: "POST",
    });
    const body = (await response.json()) as { data?: { id: string }; error?: string };

    if (!response.ok || !body.data?.id) {
      setError(body.error ?? "Falha ao duplicar orcamento.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/orcamentos/${body.data.id}`);
  };

  const canSend = allowedTransitions[currentStatus].includes("sent");
  const canApprove = allowedTransitions[currentStatus].includes("approved");
  const canReject = allowedTransitions[currentStatus].includes("rejected");
  const canConvert = currentStatus === "approved";

  return (
    <div className="flex flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Acoes do orcamento"
          className="inline-flex"
          disabled={loading}
          render={<Button type="button" size="icon-sm" variant="ghost" />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Acoes</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/orcamentos/${quoteId}`)}>
              <Eye data-icon="inline-start" />
              Abrir
            </DropdownMenuItem>
            <DropdownMenuItem disabled={loading} onClick={onDuplicate}>
              <Copy data-icon="inline-start" />
              Duplicar orcamento
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Atualizar orcamento</DropdownMenuLabel>
            <DropdownMenuItem disabled={!canApprove || loading} onClick={() => onChangeStatus("approved")}>
              <CheckCircle2 data-icon="inline-start" />
              Aprovado
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canReject || loading} onClick={() => onChangeStatus("rejected")}>
              <CircleSlash2 data-icon="inline-start" />
              Recusado
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canSend || loading} onClick={() => onChangeStatus("sent")}>
              <Send data-icon="inline-start" />
              Enviado
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Historico</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/orcamentos/${quoteId}#historico`)}>
              <History data-icon="inline-start" />
              Ver movimentacoes
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {canConvert ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={loading} onClick={onConvert}>
                  Converter em pedido
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
