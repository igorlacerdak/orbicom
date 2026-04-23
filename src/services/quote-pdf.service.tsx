import { pdf } from "@react-pdf/renderer";

import { Quote } from "@/domain/quote.types";
import { QuotePdfDocument } from "@/components/quote/quote-pdf-document";

const safeFileName = (quoteNumber: string): string =>
  quoteNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-");

export const generateAndDownloadQuotePdf = async (quote: Quote): Promise<void> => {
  const blob = await pdf(<QuotePdfDocument quote={quote} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeFileName(quote.quoteNumber)}.pdf`;
  anchor.click();

  URL.revokeObjectURL(url);
};
