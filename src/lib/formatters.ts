export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR");

export const formatCurrency = (value: number): string => currencyFormatter.format(value || 0);

export const formatDate = (value: string): string => dateFormatter.format(new Date(value));
