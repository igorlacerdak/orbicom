import { AppShell } from '@/components/layout/app-shell';
import { ClientsList } from '@/components/clients/clients-list';

export default async function ClientsPage() {
  return (
    <AppShell>
      <ClientsList />
    </AppShell>
  );
}
