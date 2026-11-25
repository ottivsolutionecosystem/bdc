"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppraisalDetailDialog } from "@/components/floor/appraisal-detail";
import { floorRequest } from "@/components/floor/floor-api";
import { PlateBadge } from "@/components/floor/floor-chrome";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateKey } from "@/lib/datetime";
import {
  ARRIVAL_MODE_LABELS,
  AWARENESS_LABELS,
  DELIVERY_STATUS_LABELS,
  ENTRY_CHANNEL_LABELS,
  FAIR_STAGE_LABELS,
  fipePayLabel,
  formatBrlFromCents,
  leadResumeStage,
  peopleInVisit,
  preparedVehicleCents,
  vehicleTitle,
} from "@/lib/floor-labels";
import { cn } from "@/lib/utils";
import type { FairAppraisalStatus, FairVisitStage } from "@/generated/prisma/enums";
import type { FloorVisitDto } from "@/types/floor";

type Filter = "ALL" | "OPEN" | "WON" | "LOST";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "OPEN", label: "Em andamento" },
  { id: "WON", label: "Fecharam" },
  { id: "LOST", label: "Não fecharam" },
];

const STAGE_TONE: Record<FairVisitStage, string> = {
  WITH_SELLER: "bg-accent text-accent-foreground",
  IN_APPRAISAL: "bg-amber-100 text-amber-950",
  WITH_FINANCE: "bg-sky-100 text-sky-950",
  AWAITING_DELIVERY: "bg-brand-navy text-white",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  LOST: "bg-slate-200 text-slate-700",
};

const APPRAISAL_STATUS: Record<FairAppraisalStatus, string> = {
  REQUESTED: "Pedida",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Cuiaba",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function FloorCustomerBase({ visits }: { visits: FloorVisitDto[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = visits.find((visit) => visit.id === openId) ?? null;
  const normalized = query.trim().toLowerCase();

  const counts = useMemo(() => {
    return {
      ALL: visits.length,
      OPEN: visits.filter(isOpen).length,
      WON: visits.filter(isWon).length,
      LOST: visits.filter((visit) => visit.stage === "LOST").length,
    };
  }, [visits]);

  const rows = useMemo(() => {
    return visits.filter((visit) => {
      if (filter === "OPEN" && !isOpen(visit)) return false;
      if (filter === "WON" && !isWon(visit)) return false;
      if (filter === "LOST" && visit.stage !== "LOST") return false;
      if (!normalized) return true;
      const primary = visit.interests.find((item) => item.primary);
      const haystack = [
        visit.customer.name,
        visit.customer.phone,
        visit.seller.name,
        visit.receptionist.name,
        visit.financeUser?.name,
        visit.lostReason,
        visit.bankName,
        visit.notes,
        visit.appraisal?.notes,
        primary ? vehicleTitle(primary.vehicle) : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [visits, filter, normalized]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Base</p>
        <h2 className="text-2xl font-semibold tracking-tight">Quem passou pelo feirão</h2>
        <p className="text-sm text-muted-foreground">Clique no cliente para ver a ficha, a troca e onde o atendimento parou.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                filter === item.id ? "bg-brand-navy text-white" : "bg-white text-foreground ring-1 ring-border",
              )}
            >
              {item.label}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, telefone, vendedor ou motivo"
          className="h-11 max-w-md bg-white"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <p className="font-semibold">Ninguém nesse recorte</p>
          <p className="mt-1 text-sm text-muted-foreground">Troque o filtro ou a busca.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((visit) => {
            const primary = visit.interests.find((item) => item.primary);
            const story = storyOf(visit);
            const people = peopleInVisit(visit.companionCount);
            return (
              <button
                key={visit.id}
                type="button"
                onClick={() => setOpenId(visit.id)}
                className="w-full rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight">{visit.customer.name}</h3>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STAGE_TONE[visit.stage])}>
                        {FAIR_STAGE_LABELS[visit.stage]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {visit.customer.phone} · {people} {people === 1 ? "pessoa" : "pessoas"} ·{" "}
                      {timeFormatter.format(new Date(visit.checkedInAt))} · {AWARENESS_LABELS[visit.awarenessSource]}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 text-sm sm:text-right">
                    <div>
                      <dt className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Recepção</dt>
                      <dd className="font-medium">{visit.receptionist.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Vendedor</dt>
                      <dd className="font-medium">{visit.seller.name}</dd>
                    </div>
                    {visit.financeUser ? (
                      <div>
                        <dt className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">F&I</dt>
                        <dd className="font-medium">{visit.financeUser.name}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/70 px-3 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Interesse</p>
                    <p className="mt-1 text-sm font-medium">
                      {primary
                        ? `${vehicleTitle(primary.vehicle)}${primary.vehicle.priceCents != null ? ` · ${formatBrlFromCents(primary.vehicle.priceCents)}` : ""}`
                        : "Nenhum veículo marcado"}
                    </p>
                  </div>
                  <div className={cn("rounded-xl px-3 py-3", story.box)}>
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-70">{story.label}</p>
                    <p className="mt-1 text-sm font-medium">{story.text}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <VisitDetail visit={selected} onOpenChange={(open) => { if (!open) setOpenId(null); }} />
    </div>
  );
}

function VisitDetail({ visit, onOpenChange }: { visit: FloorVisitDto | null; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [recovering, setRecovering] = useState(false);
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const holdFicha = useRef(false);
  useEffect(() => {
    setAppraisalOpen(false);
  }, [visit?.id]);

  function setAppraisal(next: boolean) {
    if (!next) {
      holdFicha.current = true;
      queueMicrotask(() => {
        holdFicha.current = false;
      });
    }
    setAppraisalOpen(next);
  }
  const resume = visit
    ? leadResumeStage({
        stage: visit.stage,
        hasAppraisal: visit.appraisal != null,
        reachedFinance: visit.transferredToFinanceAt != null,
      })
    : null;

  async function recover() {
    if (!visit) return;
    setRecovering(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/recover`, { method: "POST" });
      toast.success("Lead recuperado. A ficha voltou para a cadeia.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recuperar.");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <Dialog
      open={visit != null}
      onOpenChange={(open) => {
        if (!open && (appraisalOpen || holdFicha.current)) return;
        onOpenChange(open);
      }}
    >
      <DialogContent
        className="sm:max-w-3xl"
        onPointerDownOutside={(event) => {
          if (appraisalOpen) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (appraisalOpen) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (appraisalOpen) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (appraisalOpen) event.preventDefault();
        }}
      >
        {visit && resume ? (
          <>
            <div className="rounded-2xl bg-brand-navy px-5 py-5 text-white">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">Ficha</p>
              <DialogTitle className="mt-1 text-2xl text-white">{visit.customer.name}</DialogTitle>
              <DialogDescription className="mt-1 text-white/70">
                {visit.customer.phone}
                {visit.customer.email ? ` · ${visit.customer.email}` : ""}
                {visit.customer.document ? ` · ${visit.customer.document}` : ""}
              </DialogDescription>
              <p className="mt-3 text-sm text-white/80">{placeOf(visit)}</p>
            </div>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Vendedor" value={visit.seller.name} />
                <Fact label="Recepção" value={visit.receptionist.name} />
                <Fact label="F&I" value={visit.financeUser?.name ?? "Ainda não passou"} />
                <Fact label="Chegou" value={timeFormatter.format(new Date(visit.checkedInAt))} />
                <Fact label="Pessoas" value={String(peopleInVisit(visit.companionCount))} />
                <Fact label="Como chegou" value={ARRIVAL_MODE_LABELS[visit.arrivalMode]} />
                <Fact label="Entrada" value={ENTRY_CHANNEL_LABELS[visit.entryChannel]} />
                <Fact label="Ficou sabendo" value={AWARENESS_LABELS[visit.awarenessSource]} />
                <Fact label="Etapa atual" value={FAIR_STAGE_LABELS[visit.stage]} />
              </div>
              {visit.notes ? <Note label="Observação da recepção" text={visit.notes} /> : null}

              <section className="space-y-2">
                <SectionTitle kicker="Interesse" title="Veículos que viu" />
                {visit.interests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum veículo do estoque foi marcado.</p>
                ) : (
                  visit.interests.map((item) => (
                    <div key={item.vehicleId} className="flex items-center justify-between gap-3 rounded-xl bg-muted/70 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{vehicleTitle(item.vehicle)}</p>
                        <p className="text-sm text-muted-foreground">
                          {[item.vehicle.plate, item.vehicle.color, formatBrlFromCents(item.vehicle.priceCents)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {item.primary ? <span className="rounded-full bg-brand-navy px-2.5 py-0.5 text-xs font-medium text-white">Maior interesse</span> : null}
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle kicker="Troca" title={visit.appraisal ? "Carro deixado na troca" : "Não teve carro na troca"} />
                {visit.appraisal ? (
                  <TradeIn
                    appraisal={visit.appraisal}
                    customerName={visit.customer.name}
                    open={appraisalOpen}
                    onOpenChange={setAppraisal}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">O atendimento seguiu sem avaliação de usado.</p>
                )}
              </section>

              {visit.bankName || visit.delivery ? (
                <section className="space-y-2">
                  <SectionTitle kicker="Saída" title="Fechamento" />
                  {visit.bankName ? <Fact label="Banco" value={visit.bankName} /> : null}
                  {visit.delivery ? (
                    <Fact
                      label="Entrega"
                      value={[
                        visit.delivery.vehicleTitle,
                        DELIVERY_STATUS_LABELS[visit.delivery.status],
                        visit.delivery.pickupOn ? `retirada ${formatDateKey(visit.delivery.pickupOn)}` : "no evento",
                        visit.delivery.assignee?.name,
                      ].filter(Boolean).join(" · ")}
                    />
                  ) : null}
                </section>
              ) : null}

              {visit.stage === "LOST" ? (
                <div className="flex flex-col gap-3 rounded-2xl bg-rose-50 px-4 py-4 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase">Não fechou</p>
                    <p className="mt-1 text-sm font-medium">{visit.lostReason || "Sem motivo registrado."}</p>
                    <p className="mt-1 text-sm">Recuperar devolve a ficha {RESUME_TO[resume]}, com a troca e o interesse preservados.</p>
                  </div>
                  <Button type="button" disabled={recovering} onClick={() => void recover()}>
                    {recovering ? "Recuperando..." : "Recuperar lead"}
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TradeIn({
  appraisal,
  customerName,
  open,
  onOpenChange,
}: {
  appraisal: NonNullable<FloorVisitDto["appraisal"]>;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ready = preparedVehicleCents(appraisal.offerValueCents, appraisal.preparationCostCents);
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="w-full space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlateBadge plate={appraisal.plate} />
          <p className="text-sm font-medium text-amber-950">{APPRAISAL_STATUS[appraisal.status]}</p>
        </div>
        <p className="font-medium text-amber-950">
          {[appraisal.brand, appraisal.model, appraisal.year].filter(Boolean).join(" ") || "Veículo ainda sem marca e modelo"}
        </p>
        {appraisal.appraiser ? <p className="text-sm text-amber-950">Avaliador: {appraisal.appraiser.name}</p> : null}
        <div className="grid gap-2 sm:grid-cols-4">
          <Fact label="FIPE" value={formatBrlFromCents(appraisal.fipeValueCents)} />
          <Fact
            label="A pagar"
            value={formatBrlFromCents(appraisal.offerValueCents)}
            hint={fipePayLabel(appraisal.offerValueCents, appraisal.fipeValueCents)}
          />
          <Fact label="Gasto previsto" value={formatBrlFromCents(appraisal.preparationCostCents)} />
          <Fact label="Carro pronto" value={formatBrlFromCents(ready)} />
        </div>
        <p className="text-sm font-medium text-amber-950">Ver avaliação completa</p>
      </button>
      <AppraisalDetailDialog
        appraisal={appraisal}
        customerName={customerName}
        open={open}
        onOpenChange={onOpenChange}
      />
    </>
  );
}

const WHERE: Record<FairVisitStage, string> = {
  WITH_SELLER: "com o vendedor",
  IN_APPRAISAL: "na avaliação",
  WITH_FINANCE: "no F&I",
  AWAITING_DELIVERY: "na entrega",
  DELIVERED: "na entrega",
  LOST: "fora da cadeia",
};

const RESUME_TO: Record<FairVisitStage, string> = {
  WITH_SELLER: "para o vendedor",
  IN_APPRAISAL: "para a avaliação",
  WITH_FINANCE: "para o F&I",
  AWAITING_DELIVERY: "para o F&I",
  DELIVERED: "para o vendedor",
  LOST: "para o vendedor",
};

function placeOf(visit: FloorVisitDto) {
  if (visit.stage === "LOST") {
    const where = WHERE[stoppedStage(visit)];
    return `Parou ${where}${visit.lostReason ? `. ${visit.lostReason}` : "."}`;
  }
  if (visit.stage === "DELIVERED") return "O ciclo encerrou na entrega.";
  if (visit.stage === "AWAITING_DELIVERY") return "Fechou e está na saída do veículo.";
  return `Está ${WHERE[visit.stage]}.`;
}

function stoppedStage(visit: FloorVisitDto): FairVisitStage {
  if (visit.deliveryRequestedAt || visit.deliveredAt) return "AWAITING_DELIVERY";
  if (visit.transferredToFinanceAt) return "WITH_FINANCE";
  if (visit.appraisal) return "IN_APPRAISAL";
  return "WITH_SELLER";
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">{kicker}</p>
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-medium">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}

function isOpen(visit: FloorVisitDto) {
  return visit.stage !== "LOST" && visit.stage !== "DELIVERED" && visit.stage !== "AWAITING_DELIVERY";
}

function isWon(visit: FloorVisitDto) {
  return visit.stage === "DELIVERED" || visit.stage === "AWAITING_DELIVERY";
}

function storyOf(visit: FloorVisitDto) {
  if (visit.lostReason) {
    return { label: "Não fechou", text: visit.lostReason, box: "bg-rose-50 text-rose-950" };
  }
  if (visit.bankName) {
    return { label: "Fechamento", text: `Banco ${visit.bankName}`, box: "bg-emerald-50 text-emerald-950" };
  }
  if (visit.appraisal) {
    const car = [visit.appraisal.brand, visit.appraisal.model, visit.appraisal.year].filter(Boolean).join(" ");
    if (car || visit.appraisal.plate) {
      return { label: "Troca", text: car || visit.appraisal.plate, box: "bg-amber-50 text-amber-950" };
    }
    if (visit.appraisal.notes) {
      return { label: "Parecer técnico", text: visit.appraisal.notes, box: "bg-amber-50 text-amber-950" };
    }
  }
  if (visit.notes) {
    return { label: "Observação", text: visit.notes, box: "bg-muted text-foreground" };
  }
  return { label: "Registro", text: "Ainda sem parecer nem motivo.", box: "bg-muted text-muted-foreground" };
}
