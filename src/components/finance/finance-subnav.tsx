"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const links = [
  { href: "/financeiro/contas-receber", label: "Contas a receber" },
  { href: "/financeiro/contas-pagar", label: "Contas a pagar" },
];

export function FinanceSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className="inline-flex">
            <Button type="button" variant={active ? "default" : "outline"} size="sm">
              {link.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
