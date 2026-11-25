import type { ReactNode } from "react";

import { AWARENESS_LABELS, FAIR_STAGE_LABELS, peopleInVisit } from "@/lib/floor-labels";
import type { FloorVisitDto } from "@/types/floor";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function DeskBanner({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-brand-navy text-white shadow-sm">
      <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">{description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-4xl font-semibold tabular-nums leading-none">{count}</p>
          <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-white/45 uppercase">
            {count === 1 ? "ficha" : "fichas"}
          </p>
        </div>
      </div>
    </section>
  );
}

export function EmptyLane({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

export function WorkTicket({
  visit,
  children,
  footer,
}: {
  visit: FloorVisitDto;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const people = peopleInVisit(visit.companionCount);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <header className="relative bg-brand-navy px-5 py-5 text-white sm:px-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
        <div className="flex flex-wrap items-start justify-between gap-5 pl-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              {FAIR_STAGE_LABELS[visit.stage]}
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{visit.customer.name}</h3>
            <p className="mt-2 text-sm text-white/70">
              {visit.customer.phone}
              <span className="px-1.5 text-white/30">·</span>
              {people} {people === 1 ? "pessoa" : "pessoas"}
              <span className="px-1.5 text-white/30">·</span>
              chegou {timeFormatter.format(new Date(visit.checkedInAt))}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-1 sm:text-right">
            <Fact label="Recepção" value={visit.receptionist.name} />
            <Fact label="Vendedor" value={visit.seller.name} />
            <Fact label="Origem" value={AWARENESS_LABELS[visit.awarenessSource]} />
            {visit.financeUser ? <Fact label="F&I" value={visit.financeUser.name} /> : null}
          </dl>
        </div>
      </header>
      {visit.notes ? (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950 sm:px-6">{visit.notes}</p>
      ) : null}
      <div className="space-y-8 px-5 py-5 sm:px-6">{children}</div>
      {footer ? (
        <footer className="flex flex-col gap-3 border-t border-border bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {footer}
        </footer>
      ) : null}
    </article>
  );
}

export function TicketSection({
  kicker,
  title,
  hint,
  action,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">{kicker}</p>
          <h4 className="text-base font-semibold tracking-tight">{title}</h4>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-brand-navy bg-white text-brand-navy">
      <span className="flex items-center bg-brand-navy px-1.5 text-[10px] font-bold tracking-wide text-white">BR</span>
      <span className="px-2.5 py-1 font-mono text-lg font-semibold tracking-[0.18em]">{formatPlate(plate)}</span>
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-[0.12em] text-white/40 uppercase">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatPlate(plate: string) {
  const raw = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length === 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return raw || plate;
}
