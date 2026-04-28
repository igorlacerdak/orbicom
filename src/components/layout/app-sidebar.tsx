'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Building2, ClipboardList, FileText, Lock, PackageSearch, Settings2, Users, Wallet } from 'lucide-react';

import { NavUser } from '@/components/layout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const baseNavigation = [
  {
    title: 'Visao geral',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Comercial',
    items: [
      {
        title: 'Orcamentos',
        href: '/orcamentos',
        icon: FileText,
      },
      {
        title: 'Clientes',
        href: '/clientes',
        icon: Users,
      },
      {
        title: 'Produtos/Servicos',
        href: '/catalogo',
        icon: PackageSearch,
      },
      {
        title: 'Pedidos',
        href: '/pedidos',
        icon: ClipboardList,
      },
    ],
  },
];

const adminNavigation = {
  title: 'Administracao',
  items: [
    {
      title: 'Controle de acesso',
      href: '/configuracoes/acesso',
      icon: Settings2,
    },
    {
      title: 'Cache metrics',
      href: '/dev/cache-metrics',
      icon: Activity,
    },
  ],
};

type SidebarRole = 'owner' | 'admin' | 'operator' | 'finance';

type AppSidebarProps = {
  activeRoles: SidebarRole[];
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  activeWorkspaceId: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
};

export function AppSidebar({ activeRoles, workspaces, activeWorkspaceId, user }: AppSidebarProps) {
  const pathname = usePathname();
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const canAccessFinance = activeRoles.some((role) => role === 'owner' || role === 'admin' || role === 'finance');

  const financeNavigation = {
    title: 'Financeiro',
    items: [
      {
        title: 'Contas a receber',
        href: '/financeiro/contas-receber',
        icon: Wallet,
        locked: !canAccessFinance,
      },
      {
        title: 'Contas a pagar',
        href: '/financeiro/contas-pagar',
        icon: Wallet,
        locked: !canAccessFinance,
      },
    ],
  };

  const navigation = [...baseNavigation, financeNavigation, adminNavigation];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:p-0">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">Orbicom</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {activeWorkspace?.name ?? 'Gestao comercial'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const isLocked = Boolean((item as { locked?: boolean }).locked);
                  const buttonLabel = isLocked ? `${item.title} (bloqueado)` : item.title;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={!isLocked && isActive}
                        tooltip={buttonLabel}
                        aria-disabled={isLocked}
                        render={!isLocked ? <Link href={item.href} /> : undefined}
                      >
                        <Icon data-icon="inline-start" />
                        <span>{item.title}</span>
                        {isLocked ? <Lock className="ml-auto size-3.5" /> : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
