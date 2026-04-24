'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Building2, FileText, Users } from 'lucide-react';

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

const navigation = [
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
    ],
  },
];

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

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
              Gestao comercial
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

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <Icon data-icon="inline-start" />
                        <span>{item.title}</span>
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
