"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/theme/theme-provider";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return <Sonner theme={resolvedTheme} richColors closeButton duration={2800} {...props} />;
}
