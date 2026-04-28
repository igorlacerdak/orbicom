type FinanceReceivableFilters = {
  order: string;
  client: string;
  statuses: string[];
  paymentMethods: string[];
};

export const queryKeys = {
  clients: (query: string) => ["clients", query] as const,
  catalogItems: (filters: { q: string; type: string; showInactive: boolean }) =>
    ["catalog-items", filters.q, filters.type, filters.showInactive] as const,
  quotes: () => ["quotes"] as const,
  orders: () => ["orders"] as const,
  dashboard: () => ["dashboard"] as const,
  financeReceivable: (filters?: FinanceReceivableFilters) =>
    [
      "finance",
      "receivable",
      filters?.order ?? "",
      filters?.client ?? "",
      (filters?.statuses ?? []).join(","),
      (filters?.paymentMethods ?? []).join(","),
    ] as const,
  financePayable: () => ["finance", "payable"] as const,
};
