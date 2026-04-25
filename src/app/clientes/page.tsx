import { AppShell } from "@/components/layout/app-shell";
import { ClientsList } from "@/components/clients/clients-list";
import { clientService } from "@/server/client-service";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  let clients = [] as Awaited<ReturnType<typeof clientService.list>>;
  let error = "";

  try {
    clients = await clientService.list();
  } catch (err) {
    error = err instanceof Error ? err.message : "Falha ao listar clientes.";
  }

  return (
    <AppShell>
      <ClientsList initialClients={clients} initialError={error} />
    </AppShell>
  );
}
