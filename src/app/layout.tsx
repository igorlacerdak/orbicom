import type { Metadata } from 'next';
import Link from 'next/link';
import { Manrope, IBM_Plex_Mono } from 'next/font/google';

import { signOutAction } from '@/app/auth/actions';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';

import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Orbicom - Gestao comercial de ponta a ponta.',
  description: 'Orbicom - Gestao comercial de ponta a ponta.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabasePromise = createClient();

  return (
    <RootLayoutContent supabasePromise={supabasePromise}>{children}</RootLayoutContent>
  );
}

async function RootLayoutContent({
  children,
  supabasePromise,
}: Readonly<{
  children: React.ReactNode;
  supabasePromise: ReturnType<typeof createClient>;
}>) {
  const supabase = await supabasePromise;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
              <Link
                href="/orcamentos"
                className="font-heading text-sm font-semibold tracking-wide text-foreground"
              >
                Orbicom
              </Link>
              <div className="flex items-center gap-2">
                {user ? (
                  <form action={signOutAction}>
                    <Button type="submit" variant="outline" size="sm">
                      Sair
                    </Button>
                  </form>
                ) : (
                  <Link href="/auth/login" className="inline-flex">
                    <Button type="button" variant="outline" size="sm">
                      Entrar
                    </Button>
                  </Link>
                )}
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
