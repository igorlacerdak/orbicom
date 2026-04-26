export const queryKeys = {
  clients: (query: string) => ["clients", query] as const,
  catalogItems: (filters: { q: string; type: string; showInactive: boolean }) =>
    ["catalog-items", filters.q, filters.type, filters.showInactive] as const,
  quotes: () => ["quotes"] as const,
  orders: () => ["orders"] as const,
  dashboard: () => ["dashboard"] as const,
};
