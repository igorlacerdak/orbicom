type QueryMetric = {
  fetches: number;
  cacheHits: number;
};

type QueryMetricsSnapshot = Record<string, QueryMetric>;

const STORAGE_KEY = "orbicom_query_metrics";

const readMetrics = (): QueryMetricsSnapshot => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as QueryMetricsSnapshot;
  } catch {
    return {};
  }
};

const writeMetrics = (snapshot: QueryMetricsSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  (window as typeof window & { __orbicomQueryMetrics?: QueryMetricsSnapshot }).__orbicomQueryMetrics = snapshot;
};

const increment = (metricKey: string, field: keyof QueryMetric) => {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot = readMetrics();
  const current = snapshot[metricKey] ?? { fetches: 0, cacheHits: 0 };
  snapshot[metricKey] = {
    ...current,
    [field]: current[field] + 1,
  };

  writeMetrics(snapshot);
};

export const recordQueryFetch = (metricKey: string) => increment(metricKey, "fetches");

export const recordQueryCacheHit = (metricKey: string) => increment(metricKey, "cacheHits");

export const getQueryMetricsSnapshot = (): QueryMetricsSnapshot => readMetrics();
