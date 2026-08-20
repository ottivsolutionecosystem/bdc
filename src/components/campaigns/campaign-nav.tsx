"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CampaignNavItem = {
  href: string;
  label: string;
};

export function CampaignNav({ campaignId, items }: { campaignId: string; items: CampaignNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = items.find((item) => {
    const href = `/campaigns/${campaignId}/${item.href}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  return (
    <>
      <div className="md:hidden">
        <Select
          value={current?.href ?? items[0]?.href}
          onValueChange={(value) => router.push(`/campaigns/${campaignId}/${value}`)}
        >
          <SelectTrigger className="w-full" aria-label="Seção da campanha">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav className="hidden gap-1 overflow-x-auto pb-1 md:flex">
        {items.map((item) => {
          const href = `/campaigns/${campaignId}/${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
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
    </>
  );
}
