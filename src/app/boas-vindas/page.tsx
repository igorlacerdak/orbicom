import Link from "next/link";

import { PageHero } from "@/components/layout/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WelcomeWorkspaceFlow } from "@/components/workspace/welcome-workspace-flow";

export const dynamic = "force-dynamic";

export default function BoasVindasPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-8 md:px-8">
      <PageHero
        title="Como voce quer comecar?"
        description="Crie uma empresa nova no Orbicom ou participe de um workspace existente via convite."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/auth/sign-out" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Entrar com outro e-mail
            </Link>
            <Link href="/auth/sign-out" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Sair
            </Link>
          </div>
        )}
      />

      <WelcomeWorkspaceFlow />
    </main>
  );
}
