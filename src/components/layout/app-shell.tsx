import { signOutAction } from '@/app/auth/actions';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
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

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: displayName,
          email,
          avatarUrl: metadata.avatar_url,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between rounded-md border-b border-border/80 bg-background/85 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <p className="text-sm font-medium text-muted-foreground">Orbicom</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
