"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTACT_STATUS_LABELS, TEMPERATURE_LABELS } from "@/lib/campaign-labels";
import type { ContactStatus, ContactTemperature } from "@/generated/prisma/enums";

const ALL_VALUE = "__all__";
const FILTER_TRIGGER = "h-11 w-full min-w-0";

export type FilterAgentOption = { id: string; name: string };
export type FilterDispositionOption = { id: string; label: string };

export function ContactsFilterBar({
  agents,
  dispositions,
}: {
  agents: FilterAgentOption[];
  dispositions: FilterDispositionOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", search.trim() || null);
  }

  const hasActiveFilters =
    ["agentId", "status", "disposition", "temperature", "interested", "hasAppointment", "transferredToSales", "q"].some(
      (key) => searchParams.get(key)
    );

  function clearFilters() {
    const params = new URLSearchParams();
    const group = searchParams.get("group");
    const metric = searchParams.get("metric");
    if (group) params.set("group", group);
    if (metric) params.set("metric", metric);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
    setSearch("");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, telefone, veículo, parecer, observação, agente…"
          aria-label="Buscar contatos"
          className="w-full min-w-0 flex-1"
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="submit" variant="outline">
            <Search />
            Buscar
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X />
              Limpar
            </Button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))]">
        <Select value={searchParams.get("agentId") ?? ALL_VALUE} onValueChange={(v) => updateParam("agentId", v)}>
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas as agentes</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("status") ?? ALL_VALUE} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos os status</SelectItem>
            {(Object.entries(CONTACT_STATUS_LABELS) as [ContactStatus, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("temperature") ?? ALL_VALUE}
          onValueChange={(v) => updateParam("temperature", v)}
        >
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas as temperaturas</SelectItem>
            {(Object.entries(TEMPERATURE_LABELS) as [ContactTemperature, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("disposition") ?? ALL_VALUE}
          onValueChange={(v) => updateParam("disposition", v)}
        >
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Parecer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos os pareceres</SelectItem>
            {dispositions.map((disposition) => (
              <SelectItem key={disposition.id} value={disposition.id}>
                {disposition.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("interested") ?? ALL_VALUE}
          onValueChange={(v) => updateParam("interested", v === "true" ? "true" : null)}
        >
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Interesse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos os interesses</SelectItem>
            <SelectItem value="true">Interessados</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("hasAppointment") ?? ALL_VALUE}
          onValueChange={(v) => updateParam("hasAppointment", v === "true" ? "true" : null)}
        >
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Visita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Com ou sem visita</SelectItem>
            <SelectItem value="true">Visita agendada</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("transferredToSales") ?? ALL_VALUE}
          onValueChange={(v) => updateParam("transferredToSales", v === "true" ? "true" : null)}
        >
          <SelectTrigger className={FILTER_TRIGGER}>
            <SelectValue placeholder="Desfecho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos os desfechos</SelectItem>
            <SelectItem value="true">Sem interesse</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
