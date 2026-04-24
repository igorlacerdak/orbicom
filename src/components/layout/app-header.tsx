import { signOutAction } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '../ui/sidebar';

export function AppHeader() {
  return (
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
  );
}
