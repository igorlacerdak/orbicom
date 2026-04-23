"use client";

import { useSyncExternalStore } from "react";

import { Quote } from "@/domain/quote.types";
import { quoteStorageService } from "@/services/quote-storage.service";

const EMPTY_QUOTES: Quote[] = [];

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("quotes-updated", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("quotes-updated", callback);
  };
};

const getSnapshot = (): Quote[] => quoteStorageService.list();

const getServerSnapshot = (): Quote[] => EMPTY_QUOTES;

export const useQuotesStore = (): Quote[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
