"use client";

import { PlateBadge } from "@/components/floor/floor-chrome";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { FairAppraisalStatus } from "@/generated/prisma/enums";
import {
  FIXED_PHOTO_SLOTS,
  PHOTO_SLOT_LABELS,
  TIRE_CONDITION_LABELS,
  TIRE_FIELDS,
  fipePayLabel,
  formatBrlFromCents,
  preparedVehicleCents,
} from "@/lib/floor-labels";
import type { FloorVisitDto } from "@/types/floor";

const APPRAISAL_STATUS: Record<FairAppraisalStatus, string> = {
  REQUESTED: "Pedida",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
};

type Appraisal = NonNullable<FloorVisitDto["appraisal"]>;

export function AppraisalDetailDialog({
  appraisal,
  customerName,
  open,
  onOpenChange,
}: {
  appraisal: Appraisal;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const vehicle = [appraisal.brand, appraisal.model, appraisal.year].filter(Boolean).join(" ");
  const ready = preparedVehicleCents(appraisal.offerValueCents, appraisal.preparationCostCents);
  const damages = appraisal.photos.filter((photo) => photo.slot === "DAMAGE");
  const mechanicalCosts = appraisal.costs.filter((item) => item.kind === "MECHANICAL");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[70] max-h-[min(92dvh,920px)] sm:max-w-3xl"
        overlayClassName="z-[70]"
        onPointerDownOutside={(event) => event.stopPropagation()}
        onInteractOutside={(event) => event.stopPropagation()}
      >
        <div className="rounded-2xl bg-brand-navy px-5 py-5 text-white">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">Avaliação</p>
          <DialogTitle className="mt-1 text-2xl text-white">{customerName}</DialogTitle>
          <DialogDescription className="mt-1 text-white/70">
            {vehicle || "Veículo ainda sem marca e modelo"} · {APPRAISAL_STATUS[appraisal.status]}
            {appraisal.appraiser ? ` · ${appraisal.appraiser.name}` : ""}
          </DialogDescription>
        </div>

        <section className="space-y-3">
          <Section kicker="01" title="O carro" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PlateBadge plate={appraisal.plate} />
            <p className="text-sm font-medium">{APPRAISAL_STATUS[appraisal.status]}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact label="Marca" value={appraisal.brand || "—"} />
            <Fact label="Modelo" value={appraisal.model || "—"} />
            <Fact label="Ano" value={appraisal.year ? String(appraisal.year) : "—"} />
          </div>
        </section>

        <section className="space-y-3">
          <Section kicker="02" title="Valores" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="FIPE" value={formatBrlFromCents(appraisal.fipeValueCents)} />
            <Fact
              label="A pagar"
              value={formatBrlFromCents(appraisal.offerValueCents)}
              hint={fipePayLabel(appraisal.offerValueCents, appraisal.fipeValueCents)}
            />
            <Fact label="Gasto previsto" value={formatBrlFromCents(appraisal.preparationCostCents)} />
            <div className="rounded-xl bg-brand-navy px-3 py-3 text-white">
              <p className="text-[11px] font-medium tracking-[0.12em] text-white/50 uppercase">Carro pronto</p>
              <p className="text-sm font-semibold">{formatBrlFromCents(ready)}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <Section kicker="03" title="Inspeção" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FIXED_PHOTO_SLOTS.map((slot) => {
              const photo = appraisal.photos.find((item) => item.slot === slot);
              return (
                <figure key={slot} className="overflow-hidden rounded-xl border border-border bg-muted/40">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={PHOTO_SLOT_LABELS[slot]} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">Sem foto</div>
                  )}
                  <figcaption className="bg-brand-navy px-2 py-1.5 text-xs font-medium text-white">
                    {PHOTO_SLOT_LABELS[slot]}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIRE_FIELDS.map(([field, label]) => (
              <Fact key={field} label={label} value={tireLabel(appraisal[field])} />
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Avarias</p>
            {damages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaria fotografada.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {damages.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption || "Avaria"} className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="space-y-1 px-3 py-2">
                      <p className="text-sm font-medium">{photo.caption?.trim() || "Sem descrição"}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {photo.costCents != null && photo.costCents > 0 ? formatBrlFromCents(photo.costCents) : "Sem valor"}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <CostList title="Defeitos mecânicos" items={mechanicalCosts} empty="Nenhum defeito mecânico lançado." />
          </div>
        </section>

        <section className="space-y-2">
          <Section kicker="04" title="Parecer técnico" />
          <p className="rounded-xl bg-muted px-3 py-3 text-sm">
            {appraisal.notes?.trim() ? appraisal.notes : "Sem parecer ainda."}
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function CostList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { label: string; costCents: number }[];
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.label}</span>
              <span className="font-medium tabular-nums">{item.costCents > 0 ? formatBrlFromCents(item.costCents) : "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function tireLabel(condition: Appraisal["tireFrontLeft"]) {
  return condition ? TIRE_CONDITION_LABELS[condition] : "Não informado";
}

function Section({ kicker, title }: { kicker: string; title: string }) {
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
