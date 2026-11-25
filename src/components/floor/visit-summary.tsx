import { Badge } from "@/components/ui/badge";
import { formatDateKey } from "@/lib/datetime";
import {
  AWARENESS_LABELS,
  FAIR_STAGE_LABELS,
  formatBrlFromCents,
  peopleInVisit,
  preparedVehicleCents,
  vehicleTitle,
} from "@/lib/floor-labels";
import { cn } from "@/lib/utils";
import type { FloorVisitDto } from "@/types/floor";
import type { FairVisitStage } from "@/generated/prisma/enums";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const STAGE_TONE: Record<FairVisitStage, string> = {
  WITH_SELLER: "border-transparent bg-accent text-accent-foreground",
  IN_APPRAISAL: "border-transparent bg-amber-100 text-amber-950",
  WITH_FINANCE: "border-transparent bg-sky-100 text-sky-950",
  AWAITING_DELIVERY: "border-transparent bg-brand-navy text-white",
  DELIVERED: "border-transparent bg-emerald-100 text-emerald-900",
  LOST: "border-transparent bg-slate-200 text-slate-700",
};

export function VisitSummary({ visit, compact = false }: { visit: FloorVisitDto; compact?: boolean }) {
  const people = peopleInVisit(visit.companionCount);
  const primary = visit.interests.find((item) => item.primary);
  const prepared = preparedVehicleCents(visit.appraisal?.offerValueCents, visit.appraisal?.preparationCostCents);

  return (
    <div className={cn("space-y-3 border-l-2 border-primary pl-3", compact && "space-y-2")}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
          {initials(visit.customer.name)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold tracking-tight">{visit.customer.name}</p>
            <Badge className={STAGE_TONE[visit.stage]}>{FAIR_STAGE_LABELS[visit.stage]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {visit.customer.phone} · {people} {people === 1 ? "pessoa" : "pessoas"} · chegou às{" "}
            {timeFormatter.format(new Date(visit.checkedInAt))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Meta label="Recepção" value={visit.receptionist.name} />
        <Meta label="Vendedor" value={visit.seller.name} />
        {visit.financeUser ? <Meta label="F&I" value={visit.financeUser.name} /> : null}
        <Meta label="Origem" value={AWARENESS_LABELS[visit.awarenessSource]} />
      </div>
      {!compact && (primary || visit.appraisal?.offerValueCents != null || visit.delivery || visit.bankName || visit.lostReason) ? (
        <div className="space-y-1 text-sm">
          {primary ? <p>Maior interesse: {vehicleTitle(primary.vehicle)}</p> : null}
          {visit.appraisal?.offerValueCents != null ? (
            <p>
              Troca: pagar {formatBrlFromCents(visit.appraisal.offerValueCents)}
              {prepared != null ? ` · previsto pronto ${formatBrlFromCents(prepared)}` : ""}
            </p>
          ) : null}
          {visit.delivery ? (
            <p>{visit.delivery.pickupOn ? `Retirada em ${formatDateKey(visit.delivery.pickupOn)}` : "Entrega no evento"}</p>
          ) : null}
          {visit.bankName ? <p>Banco: {visit.bankName}</p> : null}
          {visit.lostReason ? <p>Motivo: {visit.lostReason}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}
