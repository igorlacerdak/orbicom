import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

// import { AppHeader } from "@/components/layout/app-header";
import { AppTopLoader } from "@/components/layout/app-top-loader";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orbicom - Gestao comercial de ponta a ponta.",
  description: "Orbicom - Gestao comercial de ponta a ponta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>
              <AppTopLoader />
              {/* Header global desativado: usamos apenas o header do AppShell */}
              {/* <AppHeader isAuthenticated={false} /> */}
              {children}
              <Toaster position="top-right" />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
