import { Quote } from "@/domain/quote.types";

export const QUOTES_STORAGE_KEY = "orcamentos:v1";

const EMPTY_QUOTES: Quote[] = [];

let cachedRaw: string | null = null;
let cachedQuotes: Quote[] = EMPTY_QUOTES;

const isClient = (): boolean => typeof window !== "undefined";

const parseStorage = (value: string | null): Quote[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Quote[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const getCachedRecords = (): Quote[] => {
  const raw = localStorage.getItem(QUOTES_STORAGE_KEY);

  if (raw === cachedRaw) {
    return cachedQuotes;
  }

  const records = parseStorage(raw).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  cachedRaw = raw;
  cachedQuotes = records;

  return records;
};

export const quoteStorageService = {
  list(): Quote[] {
    if (!isClient()) {
      return EMPTY_QUOTES;
    }

    return getCachedRecords();
  },

  getById(id: string): Quote | null {
    const records = this.list();
    return records.find((quote) => quote.id === id) ?? null;
  },

  getNextQuoteIndex(): number {
    return this.list().length + 1;
  },

  save(quote: Quote): Quote {
    if (!isClient()) {
      return quote;
    }

    const records = this.list();
    const exists = records.some((record) => record.id === quote.id);

    const nextRecords = exists
      ? records.map((record) => (record.id === quote.id ? quote : record))
      : [quote, ...records];

    const nextRaw = JSON.stringify(nextRecords);
    localStorage.setItem(QUOTES_STORAGE_KEY, nextRaw);
    cachedRaw = nextRaw;
    cachedQuotes = nextRecords;
    window.dispatchEvent(new Event("quotes-updated"));
    return quote;
  },
};
