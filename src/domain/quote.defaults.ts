import {
  Quote,
  QuoteAdjustments,
  QuoteItem,
  PartyData,
} from '@/domain/quote.types';
import { buildDefaultQuoteNotes } from '@/lib/quote-notes';

export const defaultCompany: PartyData = {
  name: 'R.A RONALDO LACERDA M.E',
  document: '06.020.782/0001-07',
  stateRegistration: '002091153.00-53',
  phone: '(34) 99151-1712',
  address: 'RUA CARLOS LUIZ BRAZ, SÃO DIMAS',
  zipCode: '38950-000',
  city: 'IBIA',
  state: 'MG',
};

export const defaultClient: PartyData = {
  name: 'CONSTRUTORA ATERPA S/A',
  document: '17.162.983/0048-29',
  stateRegistration: '000000000.00-00',
  phone: '(31) 2125-5000',
  address: 'R JUVELINO ALVES BITTENCOURT, QUADRA50 LOTE 16, VILA SILVERIA',
  zipCode: '38.183-394',
  city: 'ARAXA',
  state: 'MG',
};

export const defaultItem = (): QuoteItem => ({
  id: crypto.randomUUID(),
  catalogItemId: undefined,
  code: '',
  name: '',
  unitPrice: 0,
  quantity: 1,
  unit: 'UN',
});

export const defaultAdjustments: QuoteAdjustments = {
  discountType: 'fixed',
  discountValue: 0,
  freight: 0,
  taxRate: 0,
};

export const createQuoteNumber = (nextIndex: number): string => {
  const year = new Date().getFullYear();
  return `ORC-${year}-${String(nextIndex).padStart(4, '0')}`;
};

export const buildDraftQuote = (nextIndex: number): Quote => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    status: 'draft',
    quoteNumber: createQuoteNumber(nextIndex),
    createdAt: now,
    updatedAt: now,
    issueDate: now,
    company: defaultCompany,
    client: defaultClient,
    items: [defaultItem()],
    adjustments: defaultAdjustments,
    notes: buildDefaultQuoteNotes(0),
    totals: {
      subtotal: 0,
      discountAmount: 0,
      freight: 0,
      taxAmount: 0,
      total: 0,
    },
  };
};
