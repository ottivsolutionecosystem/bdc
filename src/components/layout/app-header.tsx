"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, PhoneCall, Users } from "lucide-react";

import { BrandLink } from "@/components/brand/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/generated/prisma/enums";

type NavItem = { href: string; label: string; icon: typeof PhoneCall };

function navGroups(role: UserRole): { title: string; items: NavItem[] }[] {
  if (role === "SELLER") {
    return [{ title: "Hoje", items: [{ href: "/sales", label: "Vendas", icon: Handshake }] }];
  }

  const hoje: NavItem[] = [{ href: "/campaigns", label: "Campanhas", icon: PhoneCall }];
  const admin: NavItem[] = [];
  if (role === "ADMIN" || role === "SUPERVISOR") {
    admin.push({ href: "/customers", label: "Clientes", icon: Handshake });
  }
  if (role === "ADMIN") {
    admin.push({ href: "/users", label: "Usuários", icon: Users });
  }

  return admin.length > 0 ? [{ title: "Hoje", items: hoje }, { title: "Administração", items: admin }] : [{ title: "Hoje", items: hoje }];
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ homeHref, role }: { homeHref: string; role: UserRole }) {
  const pathname = usePathname();
  const groups = navGroups(role);

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col bg-brand-navy pt-[env(safe-area-inset-top)] text-white max-md:hidden">
      <div className="border-b border-white/10 px-4 py-5">
        <BrandLink href={homeHref} variant="sidebar" />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.14em] text-white/45 uppercase">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {active ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" /> : null}
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AppTopbar({ role, name }: { role: UserRole; name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <div className="md:hidden">
          <BrandLink href={role === "SELLER" ? "/sales" : "/campaigns"} variant="compact" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <InstallPwaButton />
          <UserMenu name={name} role={role} />
        </div>
      </div>
    </header>
  );
}

export function AppBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = navGroups(role).flatMap((group) => group.items);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-md auto-cols-fr grid-flow-col">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active ? <span className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-primary" /> : null}
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
