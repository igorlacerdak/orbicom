import { Quote, QuoteStatus } from "@/domain/quote.types";
import { quoteService } from "@/server/quote-service";

type TopClient = {
  name: string;
  quotesCount: number;
  totalAmount: number;
};

type DashboardSnapshot = {
  totalRevenue: number;
  monthRevenue: number;
  averageTicket: number;
  quotesCount: number;
  approvalRate: number;
  statusCounts: Record<QuoteStatus, number>;
  topClients: TopClient[];
  recentQuotes: Quote[];
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const isCurrentMonth = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
};

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const quotes = await quoteService.list();

    const totals = quotes.map((quote) => quote.totals.total);
    const totalRevenue = sum(totals);
    const monthRevenue = sum(quotes.filter((quote) => isCurrentMonth(quote.issueDate)).map((quote) => quote.totals.total));
    const quotesCount = quotes.length;
    const averageTicket = quotesCount > 0 ? totalRevenue / quotesCount : 0;
    const statusCounts: Record<QuoteStatus, number> = {
      draft: 0,
      sent: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
    };

    for (const quote of quotes) {
      statusCounts[quote.status] += 1;
    }

    const consideredForApproval =
      statusCounts.sent + statusCounts.approved + statusCounts.rejected + statusCounts.converted;
    const won = statusCounts.approved + statusCounts.converted;
    const approvalRate = consideredForApproval > 0 ? (won / consideredForApproval) * 100 : 0;

    const topClientsMap = new Map<string, TopClient>();
    for (const quote of quotes) {
      const key = quote.client.name.trim().toLowerCase();
      const current = topClientsMap.get(key);

      if (!current) {
        topClientsMap.set(key, {
          name: quote.client.name,
          quotesCount: 1,
          totalAmount: quote.totals.total,
        });
      } else {
        current.quotesCount += 1;
        current.totalAmount += quote.totals.total;
      }
    }

    const topClients = [...topClientsMap.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    const recentQuotes = [...quotes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);

    return {
      totalRevenue,
      monthRevenue,
      averageTicket,
      quotesCount,
      approvalRate,
      statusCounts,
      topClients,
      recentQuotes,
    };
  },
};

export type { DashboardSnapshot, TopClient };
