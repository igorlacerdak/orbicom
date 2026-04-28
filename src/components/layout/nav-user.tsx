"use client";

import { useRouter } from "nextjs-toploader/app";
import { ChevronUp, LayoutDashboard, LogOut, Moon, Settings, Sun } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type NavUserProps = {
  name: string;
  email: string;
  avatarUrl?: string;
};

const getInitials = (name: string) => {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0].toUpperCase()).join("");
};

export function NavUser({ name, email, avatarUrl }: NavUserProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const initials = getInitials(name);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <SidebarMenuButton size="lg" tooltip={name} render={<div />}>
              <Avatar size="default">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{email || "Sem email"}</p>
              </div>
              <ChevronUp data-icon="inline-end" className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{email || "Sem email"}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard data-icon="inline-start" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/configuracoes/acesso")}>
                <Settings data-icon="inline-start" />
                Configuracoes
              </DropdownMenuItem>
              {isMobile ? (
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
                  {theme === "dark" ? "Modo claro" : "Modo escuro"}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => router.push("/auth/sign-out")}>
              <LogOut data-icon="inline-start" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
