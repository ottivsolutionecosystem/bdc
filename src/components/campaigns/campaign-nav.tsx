"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type CampaignNavItem = {
  href: string;
  label: string;
};

export function CampaignNav({ campaignId, items }: { campaignId: string; items: CampaignNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const href = `/campaigns/${campaignId}/${item.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
