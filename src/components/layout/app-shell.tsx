import { AppSidebar } from '@/components/layout/app-sidebar';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { getWorkspaceContext } from '@/server/workspace-context';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { createClient } from '@/utils/supabase/server';

type AppShellProps = {
  children: React.ReactNode;
};

const buildNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] ?? '';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();

  if (!normalized) {
    return 'Usuario';
  }

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
};

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const workspaceContext = await getWorkspaceContext();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? '';
  const metadata = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName =
    metadata.full_name || metadata.name || buildNameFromEmail(email);
  const activeWorkspace = workspaceContext.workspaces.find((workspace) => workspace.id === workspaceContext.workspaceId);

  return (
    <SidebarProvider>
      <AppSidebar
        activeRoles={workspaceContext.roles}
        workspaces={workspaceContext.workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        }))}
        activeWorkspaceId={workspaceContext.workspaceId}
        user={{
          name: displayName,
          email,
          avatarUrl: metadata.avatar_url,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between rounded-md border-b border-border/80 bg-background/85 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <p className="truncate text-sm font-medium md:hidden">
              {activeWorkspace?.name ?? 'Orbicom'}
            </p>
            <div className="hidden md:block">
              <WorkspaceSwitcher
                activeWorkspaceId={workspaceContext.workspaceId}
                workspaces={workspaceContext.workspaces.map((workspace) => ({
                  id: workspace.id,
                  name: workspace.name,
                  slug: workspace.slug,
                }))}
              />
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle compact />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
