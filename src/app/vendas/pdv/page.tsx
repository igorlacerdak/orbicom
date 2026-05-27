import { AppShell } from "@/components/layout/app-shell";
import { PdvPageClient } from "@/components/sales/pdv-page-client";

export const dynamic = "force-dynamic";

export default function PdvPage() {
  return (
    <AppShell>
      <PdvPageClient />
    </AppShell>
  );
}
