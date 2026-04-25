import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

// import { AppHeader } from "@/components/layout/app-header";
import { AppTopLoader } from "@/components/layout/app-top-loader";
import { ThemeProvider } from "@/components/theme/theme-provider";
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
          <TooltipProvider>
            <AppTopLoader />
            {/* Header global desativado: usamos apenas o header do AppShell */}
            {/* <AppHeader isAuthenticated={false} /> */}
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
