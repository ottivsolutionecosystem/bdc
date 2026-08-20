"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    updateParam("q", search || null);
  }

  const activeFilterCount = [
    "agentId",
    "status",
    "disposition",
    "temperature",
    "interested",
    "hasAppointment",
    "transferredToSales",
  ].filter((key) => searchParams.get(key)).length;

  const hasActiveFilters = activeFilterCount > 0 || searchParams.get("q");

  const filters = (
    <>
      <Select value={searchParams.get("agentId") ?? ALL_VALUE} onValueChange={(v) => updateParam("agentId", v)}>
        <SelectTrigger className="w-full md:w-40">
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
        <SelectTrigger className="w-full md:w-40">
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

      <Select value={searchParams.get("temperature") ?? ALL_VALUE} onValueChange={(v) => updateParam("temperature", v)}>
        <SelectTrigger className="w-full md:w-36">
          <SelectValue placeholder="Temperatura" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todas</SelectItem>
          {(Object.entries(TEMPERATURE_LABELS) as [ContactTemperature, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("disposition") ?? ALL_VALUE} onValueChange={(v) => updateParam("disposition", v)}>
        <SelectTrigger className="w-full md:w-48">
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

      <Select value={searchParams.get("interested") ?? ALL_VALUE} onValueChange={(v) => updateParam("interested", v === "true" ? "true" : null)}>
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Interesse" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todos os interesses</SelectItem>
          <SelectItem value="true">Quente ou morno</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("hasAppointment") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("hasAppointment", v === "true" ? "true" : null)}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="Visita" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Com ou sem visita</SelectItem>
          <SelectItem value="true">Com visita agendada</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("transferredToSales") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("transferredToSales", v === "true" ? "true" : null)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Vendas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todos os encaminhamentos</SelectItem>
          <SelectItem value="true">Encaminhado a vendas</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou veículo"
          className="min-w-0 flex-1 md:max-w-xs"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
          <Search />
        </Button>
      </form>

      <div className="flex items-center gap-2 md:contents">
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <SlidersHorizontal />
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Refine a lista de contatos desta campanha.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">{filters}</div>
            <DialogFooter>
              <Button onClick={() => setFiltersOpen(false)}>Ver resultados</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="hidden md:contents">{filters}</div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              const group = searchParams.get("group");
              if (group) params.set("group", group);
              router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
            }}
          >
            <X />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
