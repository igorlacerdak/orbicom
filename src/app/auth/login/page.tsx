import Link from "next/link";

import { signInAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
          <form action={signInAction} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <FieldContent>
                  <Input id="password" name="password" type="password" autoComplete="current-password" required />
                </FieldContent>
              </Field>
            </FieldGroup>

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
