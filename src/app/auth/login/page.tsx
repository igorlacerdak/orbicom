import Link from "next/link";

import { signInAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { message, next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 md:px-8">
      <Card className="mx-auto w-full max-w-md border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Use seu email e senha para acessar seu painel comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>

            {message ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}

            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda nao tem conta?{" "}
            <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
