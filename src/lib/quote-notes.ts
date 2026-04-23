import { formatCurrency } from '@/lib/formatters';

export const buildDefaultQuoteNotes = (totalValue: number): string => {
  const half = totalValue / 2;

  return [
    'Transportadora: ______________________________________',
    ' ',
    'Entrega: ____________________________________________',
    ' ',
    'Observacoes Gerais:',
    'Conta Juridica Banco Sicoob 756',
    'AG - 3094',
    'CC - 80244-1',
    'CNPJ: 06.020.782/0001-07',
    ' ',
    'Este orcamento tem validade de 15 dias. Apos este periodo, favor consulte-nos novamente.',
    'Todos os precos informados estao expressos em Reais (R$) e sao exclusivos para este orcamento.',
    `Pagamento entrada de 50% (${formatCurrency(half)}) ato de compra e 50% (${formatCurrency(half)}) no ato da entrega.`,
    'Atenciosamente,',
    ' ',
    '________________________',
    ' ',
    'R.A RONALDO LACERDA M.E',
  ].join('\n');
};
