"use client";

import { Check, Moon, Sun } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Alterar tema"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-[120px] justify-between")}
      >
        <span className="inline-flex items-center gap-2">
          {resolvedTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[120px]">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          Light
          {theme === "light" ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          Dark
          {theme === "dark" ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
