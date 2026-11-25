"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Check, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { HandoffVisit } from "@/components/floor/handoff-visit";
import { LoseVisitButton } from "@/components/floor/lose-visit-button";
import { EmptyLane, PlateBadge, TicketSection, WorkTicket } from "@/components/floor/floor-chrome";
import { VisitSummary } from "@/components/floor/visit-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatBrlFromCents,
  parseReais,
  VEHICLE_BODY_TYPES,
  VEHICLE_CONDITIONS,
  VEHICLE_TRANSMISSIONS,
  vehicleTitle,
} from "@/lib/floor-labels";
import type { FloorPerson, FloorVehicleDto, FloorVisitDto } from "@/types/floor";

export function SellerDesk({
  visits,
  vehicles,
  sellers,
  viewerSellerId,
  busySellerIds,
}: {
  visits: FloorVisitDto[];
  vehicles: FloorVehicleDto[];
  sellers: FloorPerson[];
  viewerSellerId?: string;
  busySellerIds: string[];
}) {
  const scoped = viewerSellerId ? visits.filter((visit) => visit.seller.id === viewerSellerId) : visits;
  if (viewerSellerId) {
    return <SellerLane visits={scoped} vehicles={vehicles} sellers={sellers} busySellerIds={busySellerIds} />;
  }

  const lanes = sellerLanes(scoped);
  if (lanes.length <= 1) {
    return (
      <SellerLane visits={lanes[0]?.visits ?? []} vehicles={vehicles} sellers={sellers} busySellerIds={busySellerIds} />
    );
  }

  return (
    <div className="space-y-8">
      {lanes.map((lane) => (
        <section key={lane.seller.id} className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">{lane.seller.name}</h2>
          <SellerLane visits={lane.visits} vehicles={vehicles} sellers={sellers} busySellerIds={busySellerIds} />
        </section>
      ))}
    </div>
  );
}

function sellerLanes(visits: FloorVisitDto[]) {
  const groups = new Map<string, { seller: FloorPerson; visits: FloorVisitDto[] }>();
  for (const visit of visits) {
    const current = groups.get(visit.seller.id) ?? { seller: visit.seller, visits: [] };
    current.visits.push(visit);
    groups.set(visit.seller.id, current);
  }
  return [...groups.values()].sort((left, right) => left.seller.name.localeCompare(right.seller.name, "pt-BR"));
}

function SellerLane({
  visits,
  vehicles,
  sellers,
  busySellerIds,
}: {
  visits: FloorVisitDto[];
  vehicles: FloorVehicleDto[];
  sellers: FloorPerson[];
  busySellerIds: string[];
}) {
  const active = visits.filter((visit) => visit.stage === "WITH_SELLER");
  const inAppraisal = visits.filter((visit) => visit.stage === "IN_APPRAISAL");
  const rest = visits.filter((visit) => visit.stage !== "WITH_SELLER" && visit.stage !== "IN_APPRAISAL");

  return (
    <div className="space-y-5">
      {active.length === 0 ? (
        <EmptyLane
          title="Nenhum cliente na venda"
          detail="A recepção chama um vendedor e a ficha aparece aqui, pronta para marcar os veículos."
        />
      ) : (
        active.map((visit) => (
          <SellerVisit key={visit.id} visit={visit} vehicles={vehicles} sellers={sellers} busySellerIds={busySellerIds} />
        ))
      )}
      {inAppraisal.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Na avaliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inAppraisal.map((visit) => (
              <AppraisalFollowup key={visit.id} visit={visit} vehicles={vehicles} />
            ))}
          </CardContent>
        </Card>
      ) : null}
      {rest.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Já encaminhados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {rest.map((visit) => (
              <VisitSummary key={visit.id} visit={visit} compact />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function AppraisalFollowup({ visit, vehicles }: { visit: FloorVisitDto; vehicles: FloorVehicleDto[] }) {
  const router = useRouter();
  const initial = interestsFromVisit(visit);
  const [selected, setSelected] = useState<Record<string, boolean>>(initial.selected);
  const [primaryId, setPrimaryId] = useState(initial.primaryId);
  const [stockOpen, setStockOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const chosen = vehicles.filter((vehicle) => selected[vehicle.id]);

  function toggle(vehicleId: string, checked: boolean) {
    const already = Boolean(selected[vehicleId]);
    const count = Object.values(selected).filter(Boolean).length;
    if (checked && !already && count >= 5) {
      toast.error("O cliente pode marcar até 5 veículos.");
      return;
    }
    setSelected((current) => ({ ...current, [vehicleId]: checked }));
    if (!checked && primaryId === vehicleId) {
      const fallback = Object.entries(selected).find(([id, on]) => on && id !== vehicleId)?.[0] ?? "";
      setPrimaryId(fallback);
    }
    if (checked && !primaryId) setPrimaryId(vehicleId);
  }

  async function saveInterests() {
    const chosenVehicles = vehicles.filter((vehicle) => selected[vehicle.id]);
    const primary = chosenVehicles.some((vehicle) => vehicle.id === primaryId) ? primaryId : chosenVehicles[0]?.id;
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/interests`, {
        method: "PUT",
        body: JSON.stringify({
          interests: chosenVehicles.map((vehicle) => ({ vehicleId: vehicle.id, primary: vehicle.id === primary })),
        }),
      });
      toast.success("Interesse registrado.");
      setStockOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelAppraisal() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/appraisal`, { method: "DELETE" });
      toast.success("Avaliação cancelada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="font-medium">{visit.customer.name}</p>
          <p className="text-sm text-amber-950">
            {chosen.length > 0
              ? "A ficha está com o avaliador. O veículo anexado segue junto para o F&I."
              : "A ficha está com o avaliador. Anexe um veículo, senão ela não segue para o F&I."}
          </p>
          {visit.appraisal?.plate ? <PlateBadge plate={visit.appraisal.plate} /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setStockOpen(true)}>
            {chosen.length > 0 ? "Alterar veículo" : "Anexar veículo"}
          </Button>
          {visit.appraisal?.status === "REQUESTED" ? (
            <Button type="button" variant="outline" disabled={submitting} onClick={cancelAppraisal}>
              Cancelar avaliação
            </Button>
          ) : null}
        </div>
      </div>
      {chosen.length > 0 ? (
        <div className="grid gap-2">
          {chosen.map((vehicle) => (
            <div key={vehicle.id} className="rounded-lg bg-white px-3 py-2">
              <p className="text-sm font-medium">{vehicleTitle(vehicle)}</p>
              <p className="text-xs text-muted-foreground">
                {primaryId === vehicle.id ? "Maior interesse · " : ""}
                {formatBrlFromCents(vehicle.priceCents)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <StockDialog
        open={stockOpen}
        vehicles={vehicles}
        selected={selected}
        primaryId={primaryId}
        submitting={submitting}
        onOpenChange={setStockOpen}
        onToggle={toggle}
        onPrimary={setPrimaryId}
        onConfirm={saveInterests}
      />
    </div>
  );
}

function freeSellers(sellers: FloorPerson[], busySellerIds: string[], currentSellerId: string) {
  const busy = new Set(busySellerIds);
  return sellers.filter((seller) => seller.id !== currentSellerId && !busy.has(seller.id));
}

function interestsFromVisit(visit: FloorVisitDto) {
  return {
    selected: Object.fromEntries(visit.interests.map((item) => [item.vehicleId, true])) as Record<string, boolean>,
    primaryId: visit.interests.find((item) => item.primary)?.vehicleId ?? "",
  };
}

function SellerVisit({
  visit,
  vehicles,
  sellers,
  busySellerIds,
}: {
  visit: FloorVisitDto;
  vehicles: FloorVehicleDto[];
  sellers: FloorPerson[];
  busySellerIds: string[];
}) {
  const router = useRouter();
  const initial = interestsFromVisit(visit);
  const [selected, setSelected] = useState<Record<string, boolean>>(initial.selected);
  const [primaryId, setPrimaryId] = useState(initial.primaryId);
  const [stockOpen, setStockOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const waitingAppraisal = visit.stage === "IN_APPRAISAL";
  const chosen = vehicles.filter((vehicle) => selected[vehicle.id]);
  const canSendToFinance = chosen.length > 0;

  function toggle(vehicleId: string, checked: boolean) {
    const already = Boolean(selected[vehicleId]);
    const count = Object.values(selected).filter(Boolean).length;
    if (checked && !already && count >= 5) {
      toast.error("O cliente pode marcar até 5 veículos.");
      return;
    }
    setSelected((current) => ({ ...current, [vehicleId]: checked }));
    if (!checked && primaryId === vehicleId) {
      const fallback = Object.entries(selected).find(([id, on]) => on && id !== vehicleId)?.[0] ?? "";
      setPrimaryId(fallback);
    }
    if (checked && !primaryId) setPrimaryId(vehicleId);
  }

  function currentInterests() {
    const chosenVehicles = vehicles.filter((vehicle) => selected[vehicle.id]);
    const primary = chosenVehicles.some((vehicle) => vehicle.id === primaryId) ? primaryId : chosenVehicles[0]?.id;
    return chosenVehicles.map((vehicle) => ({ vehicleId: vehicle.id, primary: vehicle.id === primary }));
  }

  async function saveInterests() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/interests`, {
        method: "PUT",
        body: JSON.stringify({ interests: currentInterests() }),
      });
      toast.success("Interesse registrado.");
      setStockOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAppraisal() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/appraisal`, {
        method: "POST",
        body: JSON.stringify({ plate: plate.replace(/[^a-zA-Z0-9]/g, "") }),
      });
      toast.success("Avaliação solicitada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível solicitar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function transfer() {
    setSubmitting(true);
    try {
      await saveInterestsQuiet();
      await floorRequest(`/api/floor/visits/${visit.id}/transfer`, { method: "POST" });
      toast.success("Cliente enviado ao F&I.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveInterestsQuiet() {
    await floorRequest(`/api/floor/visits/${visit.id}/interests`, {
      method: "PUT",
      body: JSON.stringify({ interests: currentInterests() }),
    });
  }

  async function cancelAppraisal() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/appraisal`, { method: "DELETE" });
      toast.success("Avaliação cancelada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkTicket
      visit={visit}
      footer={
        <>
          <HandoffVisit
            visitId={visit.id}
            options={freeSellers(sellers, busySellerIds, visit.seller.id)}
            label="Passar para outro vendedor"
            emptyLabel={
              sellers.some((seller) => seller.id !== visit.seller.id)
                ? "Os outros vendedores estão em atendimento."
                : "Cadastre outro vendedor ativo para transferir este atendimento."
            }
          />
          {!waitingAppraisal || visit.appraisal?.status === "REQUESTED" ? <LoseVisitButton visitId={visit.id} /> : null}
        </>
      }
    >
      <TicketSection
        kicker="01"
        title="Veículos de interesse"
        hint={
          waitingAppraisal
            ? "A avaliação segue em paralelo. Sem um veículo anexado, a ficha não vai para o F&I."
            : "O de maior interesse é o que o F&I recebe como principal."
        }
        action={
          chosen.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStockOpen(true)}>
              Alterar
            </Button>
          ) : null
        }
      >
        {chosen.length === 0 ? (
          <button
            type="button"
            onClick={() => setStockOpen(true)}
            className="flex w-full flex-col items-start gap-1 rounded-2xl border border-dashed border-primary/40 bg-accent px-5 py-8 text-left transition hover:border-primary"
          >
            <span className="text-base font-semibold text-accent-foreground">Escolher no estoque</span>
            <span className="text-sm text-accent-foreground/80">Marque o que o cliente viu e qual é o de maior interesse.</span>
          </button>
        ) : (
          <div className="grid gap-2">
            {chosen.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{vehicleTitle(vehicle)}</p>
                  <p className="text-sm text-muted-foreground">
                    {[vehicle.plate, vehicle.color, formatBrlFromCents(vehicle.priceCents)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {primaryId === vehicle.id ? <Badge>Maior interesse</Badge> : null}
              </div>
            ))}
          </div>
        )}
      </TicketSection>
      <StockDialog
        open={stockOpen}
        vehicles={vehicles}
        selected={selected}
        primaryId={primaryId}
        submitting={submitting}
        onOpenChange={setStockOpen}
        onToggle={toggle}
        onPrimary={setPrimaryId}
        onConfirm={saveInterests}
      />
      {waitingAppraisal ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 px-5 py-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase">Aguardando avaliação</p>
            {visit.appraisal?.plate ? <PlateBadge plate={visit.appraisal.plate} /> : null}
            <p className="max-w-md text-sm text-amber-950">
              {canSendToFinance
                ? "O F&I só recebe esta ficha quando o avaliador concluir. Você pode acompanhar daqui."
                : "Anexe um veículo de interesse. Sem ele, a avaliação concluída não segue para o F&I."}
            </p>
          </div>
          {visit.appraisal?.status === "REQUESTED" ? (
            <Button type="button" variant="outline" disabled={submitting} onClick={cancelAppraisal}>
              Cancelar avaliação
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-2xl border border-border p-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Caminho A</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">Tem troca</p>
              <p className="text-sm text-muted-foreground">A placa vai para o avaliador. O F&I espera o parecer.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`plate-${visit.id}`}>Placa</Label>
              <Input
                id={`plate-${visit.id}`}
                value={plate}
                onChange={(event) => setPlate(event.target.value.toUpperCase())}
                placeholder="ABC1D23"
                className="font-mono text-lg tracking-[0.14em] uppercase"
              />
            </div>
            <Button type="button" variant="outline" disabled={submitting || plate.trim().length < 7} onClick={requestAppraisal}>
              Pedir avaliação
            </Button>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-brand-navy p-5 text-white">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">Caminho B</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">Sem troca, fechar agora</p>
              <p className="text-sm text-white/70">
                {canSendToFinance
                  ? "A ficha segue ao F&I com os veículos já marcados."
                  : "Escolha pelo menos um veículo antes de enviar."}
              </p>
            </div>
            <Button type="button" disabled={submitting || !canSendToFinance} onClick={transfer}>
              Enviar ao F&I
            </Button>
          </div>
        </div>
      )}
    </WorkTicket>
  );
}

export function StockDialog({
  open,
  vehicles,
  selected,
  primaryId,
  submitting,
  onOpenChange,
  onToggle,
  onPrimary,
  onConfirm,
  mode = "interest",
}: {
  open: boolean;
  vehicles: FloorVehicleDto[];
  selected: Record<string, boolean>;
  primaryId: string;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (vehicleId: string, checked: boolean) => void;
  onPrimary: (vehicleId: string) => void;
  onConfirm: () => void;
  mode?: "interest" | "closed";
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("nome");
  const [filters, setFilters] = useState<StockFilters>(defaultFilters);
  const [draft, setDraft] = useState<StockFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const brands = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.brand))].sort((left, right) => left.localeCompare(right, "pt-BR")),
    [vehicles],
  );
  const colors = useMemo(
    () =>
      [...new Set(vehicles.map((vehicle) => vehicle.color).filter((color): color is string => Boolean(color)))].sort((left, right) =>
        left.localeCompare(right, "pt-BR"),
      ),
    [vehicles],
  );
  const visible = vehicles
    .filter((vehicle) => matchesQuery(vehicle, query) && matchesFilters(vehicle, filters))
    .sort((left, right) => compareVehicles(left, right, sort));
  const selectedCount = vehicles.filter((vehicle) => selected[vehicle.id]).length;
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSort("nome");
    setFilters(defaultFilters);
    setDraft(defaultFilters);
    setFiltersOpen(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (!filtersOpen) return;
          event.preventDefault();
          setFiltersOpen(false);
        }}
        className="flex max-h-[min(92dvh,900px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 bg-brand-navy px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Car className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg text-white">
                {mode === "closed" ? "Selecionar o veículo fechado" : "Selecionar veículos do estoque"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-white/70">
                {mode === "closed"
                  ? "Toque no card. Pode ser um veículo que o vendedor não marcou."
                  : "Toque no card para marcar. Até 5 veículos. O maior interesse segue para o F&I."}
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="rounded-md p-1 text-white/70 hover:text-white">
            <span className="sr-only">Fechar</span>
            <span aria-hidden className="text-xl leading-none">×</span>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou placa"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            />
          </div>
          <Button type="button" className="shrink-0">
            Buscar
          </Button>
          <Button
            type="button"
            variant={filterCount > 0 ? "default" : "outline"}
            className="shrink-0"
            onClick={() => {
              setDraft(filters);
              setFiltersOpen(true);
            }}
          >
            <SlidersHorizontal className="size-4" />
            Filtros{filterCount > 0 ? ` · ${filterCount}` : ""}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Relevância" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="menor">Menor preço</SelectItem>
              <SelectItem value="maior">Maior preço</SelectItem>
              <SelectItem value="ano">Ano mais novo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          {vehicles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">O estoque deste feirão ainda está vazio.</p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum veículo encontrado.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {visible.map((vehicle) => {
                const marked = Boolean(selected[vehicle.id]);
                const primary = primaryId === vehicle.id;
                return (
                  <div
                    key={vehicle.id}
                    className={`overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 transition ${
                      marked ? "ring-2 ring-primary" : "ring-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(vehicle.id, !marked)}
                      className="block w-full text-left"
                    >
                      <div className="relative flex aspect-[4/3] items-center justify-center bg-brand-navy">
                        <Car className="size-10 text-white/30" />
                        {vehicle.plate ? (
                          <span className="absolute bottom-2 left-2 rounded bg-white/95 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-brand-navy">
                            {vehicle.plate}
                          </span>
                        ) : null}
                        {marked ? (
                          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1.5 p-3">
                        <p className="line-clamp-2 text-xs font-semibold tracking-wide uppercase">{vehicleTitle(vehicle)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[vehicle.year, vehicle.color, vehicle.mileageKm == null ? null : `${vehicle.mileageKm.toLocaleString("pt-BR")} km`]
                            .filter(Boolean)
                            .join(" · ") || "Sem ano e cor"}
                        </p>
                        <p className="text-sm font-semibold text-primary">{formatBrlFromCents(vehicle.priceCents)}</p>
                      </div>
                    </button>
                    {mode === "interest" && marked ? (
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          onClick={() => onPrimary(vehicle.id)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            primary ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {primary ? "Maior interesse" : "Marcar maior interesse"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-white px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={submitting || selectedCount === 0} onClick={onConfirm}>
            {submitting ? "Salvando..." : mode === "closed" ? "Usar este veículo" : "Continuar"}
          </Button>
        </div>
        {filtersOpen ? (
          <FilterSheet
            draft={draft}
            brands={brands}
            colors={colors}
            onChange={setDraft}
            onClose={() => setFiltersOpen(false)}
            onApply={() => {
              setFilters(draft);
              setFiltersOpen(false);
            }}
          />
        ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StockFilters = {
  brand: string;
  condition: string;
  transmission: string;
  color: string;
  bodyType: string;
  yearFrom: string;
  yearTo: string;
  priceFrom: string;
  priceTo: string;
  kmFrom: string;
  kmTo: string;
  promoOnly: boolean;
};

const defaultFilters: StockFilters = {
  brand: "todas",
  condition: "todas",
  transmission: "todos",
  color: "todas",
  bodyType: "todos",
  yearFrom: "",
  yearTo: "",
  priceFrom: "",
  priceTo: "",
  kmFrom: "",
  kmTo: "",
  promoOnly: false,
};

function FilterSheet({
  draft,
  brands,
  colors,
  onChange,
  onClose,
  onApply,
}: {
  draft: StockFilters;
  brands: string[];
  colors: string[];
  onChange: (next: StockFilters) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  function set<K extends keyof StockFilters>(key: K, value: StockFilters[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-brand-navy/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-lg font-semibold">Filtros de Busca</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para encontrar o veículo ideal</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <span className="sr-only">Fechar filtros</span>
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <FilterSelect label="Marca" value={draft.brand} allLabel="Todas as marcas" options={brands} onChange={(value) => set("brand", value)} />
          <FilterSelect
            label="Condição"
            value={draft.condition}
            allLabel="Todas as condições"
            options={VEHICLE_CONDITIONS}
            onChange={(value) => set("condition", value)}
          />
          <FilterSelect
            label="Câmbio"
            value={draft.transmission}
            allLabel="Todos os câmbios"
            options={VEHICLE_TRANSMISSIONS}
            onChange={(value) => set("transmission", value)}
          />
          <FilterSelect label="Cor" value={draft.color} allLabel="Todas as cores" options={colors} onChange={(value) => set("color", value)} />
          <FilterSelect
            label="Tipo de Carroceria"
            value={draft.bodyType}
            allLabel="Todos os tipos"
            options={VEHICLE_BODY_TYPES}
            onChange={(value) => set("bodyType", value)}
          />
          <RangeFields
            label="Ano"
            from={draft.yearFrom}
            to={draft.yearTo}
            fromPlaceholder="Mínimo"
            toPlaceholder="Máximo"
            onFrom={(value) => set("yearFrom", value)}
            onTo={(value) => set("yearTo", value)}
          />
          <RangeFields
            label="Preço"
            from={draft.priceFrom}
            to={draft.priceTo}
            fromPlaceholder="Mínimo"
            toPlaceholder="Máximo"
            prefix="R$"
            onFrom={(value) => set("priceFrom", value)}
            onTo={(value) => set("priceTo", value)}
          />
          <RangeFields
            label="Quilometragem"
            from={draft.kmFrom}
            to={draft.kmTo}
            fromPlaceholder="Mínimo"
            toPlaceholder="Máximo"
            suffix="km"
            onFrom={(value) => set("kmFrom", value)}
            onTo={(value) => set("kmTo", value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.promoOnly} onCheckedChange={(checked) => set("promoOnly", checked === true)} />
            Apenas veículos em promoção
          </label>
        </div>
        <div className="border-t border-border p-4">
          <Button type="button" className="w-full" onClick={onApply}>
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue(allLabel)}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function allValue(allLabel: string) {
  return allLabel.startsWith("Todas") ? "todas" : "todos";
}

function RangeFields({
  label,
  from,
  to,
  fromPlaceholder,
  toPlaceholder,
  prefix,
  suffix,
  onFrom,
  onTo,
}: {
  label: string;
  from: string;
  to: string;
  fromPlaceholder: string;
  toPlaceholder: string;
  prefix?: string;
  suffix?: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <RangeInput label="De" value={from} placeholder={fromPlaceholder} prefix={prefix} suffix={suffix} onChange={onFrom} />
        <RangeInput label="Até" value={to} placeholder={toPlaceholder} prefix={prefix} suffix={suffix} onChange={onTo} />
      </div>
    </div>
  );
}

function RangeInput({
  label,
  value,
  placeholder,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span> : null}
        <Input
          value={value}
          inputMode="decimal"
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={prefix ? "pl-9" : suffix ? "pr-10" : undefined}
        />
        {suffix ? <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

function matchesQuery(vehicle: FloorVehicleDto, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const name = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ").toLowerCase();
  const plate = (vehicle.plate ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const compact = needle.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return name.includes(needle) || (compact.length > 0 && plate.includes(compact));
}

function matchesFilters(vehicle: FloorVehicleDto, filters: StockFilters) {
  if (!matchesChoice(vehicle.brand, filters.brand)) return false;
  if (!matchesChoice(vehicle.condition, filters.condition)) return false;
  if (!matchesChoice(vehicle.transmission, filters.transmission)) return false;
  if (!matchesChoice(vehicle.color, filters.color)) return false;
  if (!matchesChoice(vehicle.bodyType, filters.bodyType)) return false;
  if (!inRange(vehicle.year, filters.yearFrom, filters.yearTo)) return false;
  if (!inRange(vehicle.priceCents == null ? null : vehicle.priceCents / 100, filters.priceFrom, filters.priceTo)) return false;
  if (!inRange(vehicle.mileageKm, filters.kmFrom, filters.kmTo)) return false;
  if (filters.promoOnly && !vehicle.onPromotion) return false;
  return true;
}

function matchesChoice(value: string | null, selected: string) {
  if (selected === "todas" || selected === "todos") return true;
  return value === selected;
}

function inRange(value: number | null, fromRaw: string, toRaw: string) {
  const from = parseReais(fromRaw);
  const to = parseReais(toRaw);
  if (from == null && to == null) return true;
  if (value == null) return false;
  if (from != null && value < from) return false;
  if (to != null && value > to) return false;
  return true;
}

function activeFilterCount(filters: StockFilters) {
  let count = 0;
  if (filters.brand !== "todas") count += 1;
  if (filters.condition !== "todas") count += 1;
  if (filters.transmission !== "todos") count += 1;
  if (filters.color !== "todas") count += 1;
  if (filters.bodyType !== "todos") count += 1;
  if (filters.yearFrom.trim() || filters.yearTo.trim()) count += 1;
  if (filters.priceFrom.trim() || filters.priceTo.trim()) count += 1;
  if (filters.kmFrom.trim() || filters.kmTo.trim()) count += 1;
  if (filters.promoOnly) count += 1;
  return count;
}

function compareVehicles(left: FloorVehicleDto, right: FloorVehicleDto, sort: string) {
  if (sort === "menor" || sort === "maior") {
    const leftPrice = left.priceCents ?? (sort === "menor" ? Number.MAX_SAFE_INTEGER : -1);
    const rightPrice = right.priceCents ?? (sort === "menor" ? Number.MAX_SAFE_INTEGER : -1);
    return sort === "menor" ? leftPrice - rightPrice : rightPrice - leftPrice;
  }
  if (sort === "ano") return (right.year ?? 0) - (left.year ?? 0);
  return vehicleTitle(left).localeCompare(vehicleTitle(right), "pt-BR");
}
