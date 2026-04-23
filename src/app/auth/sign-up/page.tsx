import Link from "next/link";

import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: PageProps) {
  const { message } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 md:px-8">
      <Card className="mx-auto w-full max-w-md border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Crie seu acesso para salvar orcamentos com seguranca.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>

            {message ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}

            <Button type="submit" className="w-full">
              Criar conta
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ja possui conta?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
