import { pdf } from "@react-pdf/renderer";

import { QuotePdfDocument } from "@/components/quote/quote-pdf-document";
import { quoteService, UnauthorizedError } from "@/server/quote-service";

type Context = {
  params: Promise<{ id: string }>;
};

const fileNameFromQuote = (quoteNumber: string) =>
  `${quoteNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.pdf`;

export async function GET(_: Request, context: Context) {
  try {
    const { id } = await context.params;
    const quote = await quoteService.getById(id);

    if (!quote) {
      return new Response("Orcamento nao encontrado.", { status: 404 });
    }

    const blob = await pdf(<QuotePdfDocument quote={quote} />).toBlob();
    const arrayBuffer = await blob.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileNameFromQuote(quote.quoteNumber)}\"`,
      },
    });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(error instanceof Error ? error.message : "Falha ao gerar PDF.", {
      status,
    });
  }
}
