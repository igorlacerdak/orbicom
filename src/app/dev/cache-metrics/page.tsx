import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { CacheMetricsPanel } from "@/components/dev/cache-metrics-panel";

export default function CacheMetricsPage() {
  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
        <PageHero
          title="Cache Metrics"
          description="Painel interno para acompanhar fetches, cache hits e taxa de aproveitamento do cache por modulo."
        />

        <CacheMetricsPanel />
      </main>
    </AppShell>
  );
}
