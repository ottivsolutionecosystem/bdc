"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TIMEZONE, dateKeyInAppTz, formatDateKey, hourInAppTz, todayKeyInAppTz } from "@/lib/datetime";
import { AWARENESS_LABELS, FAIR_STAGE_LABELS, formatBrlFromCents, peopleInVisit, vehicleTitle } from "@/lib/floor-labels";
import type { FairVisitStage } from "@/generated/prisma/enums";
import type { FloorVisitDto } from "@/types/floor";

const OPEN_STAGES = ["WITH_SELLER", "IN_APPRAISAL", "WITH_FINANCE", "AWAITING_DELIVERY"] as const;

const STAGE_WAIT_MINUTES: Record<(typeof OPEN_STAGES)[number], number> = {
  WITH_SELLER: 25,
  IN_APPRAISAL: 20,
  WITH_FINANCE: 30,
  AWAITING_DELIVERY: 20,
};

const STAGE_ACTION: Record<(typeof OPEN_STAGES)[number], string> = {
  WITH_SELLER: "O vendedor está segurando o cliente. Confira se falta estoque, avaliação ou decisão.",
  IN_APPRAISAL: "A ficha não chega no F&I enquanto a avaliação não terminar.",
  WITH_FINANCE: "O fechamento está parado. Veja objeção, banco e o valor da troca.",
  AWAITING_DELIVERY: "O negócio já fechou. A entrega é o que falta para encerrar.",
};

const COLORS = {
  navy: "#0f1e35",
  orange: "#f06500",
  green: "#28a745",
  red: "#dc2626",
  blue: "#3b82f6",
};

export function FloorDashboard({ visits }: { visits: FloorVisitDto[] }) {
  const [now, setNow] = useState(0);
  const [today, setToday] = useState("");
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      setToday(todayKeyInAppTz(new Date(current)));
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const days = useMemo(() => arrivalDays(visits, today), [visits, today]);
  const visible = day ? visits.filter((visit) => dateKeyInAppTz(visit.checkedInAt) === day) : visits;
  const dayLabel = day ? (day === today ? "Hoje" : formatDateKey(day)) : null;

  const closed = visible.filter(isClosed);
  const delivered = visible.filter((visit) => visit.stage === "DELIVERED");
  const lost = visible.filter((visit) => visit.stage === "LOST");
  const open = visible.filter((visit) => isOpenStage(visit.stage));
  const people = visible.reduce((sum, visit) => sum + peopleInVisit(visit.companionCount), 0);
  const peopleNow = open.reduce((sum, visit) => sum + peopleInVisit(visit.companionCount), 0);
  const closeRate = percent(closed.length, visible.length);
  const lossRate = percent(lost.length, visible.length);
  const deliveryRate = percent(delivered.length, closed.length);
  const fairEmpty = visits.length === 0;
  const dayEmpty = !fairEmpty && visible.length === 0;

  const chain = [
    { name: "Entraram", value: visible.length },
    { name: "Avaliação", value: visible.filter(reachedAppraisal).length },
    { name: "F&I", value: visible.filter(reachedFinance).length },
    { name: "Entrega pedida", value: visible.filter(reachedDelivery).length },
    { name: "Entregue", value: delivered.length },
  ];

  const stagesNow = OPEN_STAGES.map((stage) => ({
    name: FAIR_STAGE_LABELS[stage],
    stage,
    atendimentos: visible.filter((visit) => visit.stage === stage).length,
    pessoas: visible
      .filter((visit) => visit.stage === stage)
      .reduce((sum, visit) => sum + peopleInVisit(visit.companionCount), 0),
  }));
  const bottleneck = [...stagesNow].sort((left, right) => right.atendimentos - left.atendimentos)[0];

  const stuck = open
    .map((visit) => {
      const pickup = visit.stage === "AWAITING_DELIVERY" ? visit.delivery?.pickupOn : null;
      if (pickup) {
        const late = now !== 0 && pickup < todayKeyInAppTz(new Date(now));
        return {
          visit,
          waited: late ? 100000 : 0,
          late,
          note: late
            ? `Retirada em ${formatDateKey(pickup)} · passou do dia`
            : `Retirada em ${formatDateKey(pickup)} · ${visit.seller.name}`,
        };
      }
      const waited = minutesSince(stageStartedAt(visit), now);
      const limit = STAGE_WAIT_MINUTES[visit.stage as (typeof OPEN_STAGES)[number]];
      return {
        visit,
        waited,
        late: waited >= limit,
        note: `${FAIR_STAGE_LABELS[visit.stage]} · ${visit.seller.name} · alerta após ${limit} min`,
      };
    })
    .sort((left, right) => Number(right.late) - Number(left.late) || right.waited - left.waited);

  const clockReady = now !== 0;
  const lateCount = clockReady ? stuck.filter((item) => item.late).length : 0;
  const sellers = sellerRows(visible);
  const awareness = countRows(visible, (visit) => AWARENESS_LABELS[visit.awarenessSource]);
  const reasons = countRows(
    lost.filter((visit) => visit.lostReason),
    (visit) => visit.lostReason ?? "Sem motivo"
  );
  const banks = countRows(
    closed.filter((visit) => visit.bankName),
    (visit) => visit.bankName ?? "Sem banco"
  );
  const vehicles = vehicleRows(visible);
  const hours = hourRows(visible);
  const interestPrices = visible
    .map((visit) => visit.interests.find((item) => item.primary)?.vehicle.priceCents)
    .filter((price): price is number => price != null);
  const closedPrices = closed.map(priceOf).filter((price): price is number => price != null);
  const appraisals = visible.map((visit) => visit.appraisal).filter((item) => item != null);
  const pricedAppraisals = appraisals.filter((item) => item.offerValueCents != null && item.fipeValueCents);
  const offerVsFipe =
    pricedAppraisals.length === 0
      ? null
      : Math.round(
          (pricedAppraisals.reduce(
            (sum, item) => sum + (item.offerValueCents ?? 0) / (item.fipeValueCents || 1),
            0
          ) /
            pricedAppraisals.length) *
            100
        );

  const headline = fairEmpty
    ? "A recepção ainda não registrou ninguém."
    : dayEmpty
      ? "Ninguém entrou neste dia."
      : !clockReady
        ? `${countLabel(open.length, "ficha aberta", "fichas abertas")} no salão.`
        : lateCount > 0
          ? `${countLabel(lateCount, "ficha passou", "fichas passaram")} do tempo da etapa.`
          : bottleneck && bottleneck.atendimentos > 0
            ? `${bottleneck.name} concentra o movimento.`
            : "Nenhuma ficha aberta neste momento.";
  const headlineDetail = fairEmpty
    ? "O painel começa a contar quando a primeira chegada entra."
    : dayEmpty
      ? "Esse dia ainda não tem chegada na recepção."
      : !clockReady
        ? `${countLabel(visible.length, "atendimento", "atendimentos")}, ${countLabel(people, "pessoa", "pessoas")}.`
        : lateCount > 0
          ? "A lista abaixo está da mais atrasada para a mais recente. Corrija essa etapa antes de olhar o resto."
          : bottleneck && bottleneck.atendimentos > 0
            ? `${countLabel(bottleneck.atendimentos, "atendimento", "atendimentos")} e ${countLabel(bottleneck.pessoas, "pessoa", "pessoas")}. ${STAGE_ACTION[bottleneck.stage]}`
            : `${countLabel(closed.length, "fechou", "fecharam")} e ${countLabel(lost.length, "não fechou", "não fecharam")}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Dia</p>
        <DayChip active={day === null} onClick={() => setDay(null)}>
          Todos
        </DayChip>
        {days.map((item) => (
          <DayChip key={item.key} active={day === item.key} onClick={() => setDay(item.key)}>
            {item.label}
            <span className="ml-1.5 tabular-nums opacity-70">{item.count}</span>
          </DayChip>
        ))}
      </div>

      <section className={`overflow-hidden rounded-2xl text-white shadow-sm ${lateCount > 0 ? "bg-rose-950" : "bg-brand-navy"}`}>
        <div className="px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">{dayLabel ?? "Agora"}</p>
          <h2 className="mt-1 max-w-3xl text-2xl font-semibold tracking-tight">{headline}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">{headlineDetail}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
          <Score label="Entraram" value={String(visible.length)} hint={`${people} pessoas`} />
          <Score label="Agora" value={String(peopleNow)} hint={countLabel(open.length, "ficha", "fichas")} />
          <Score label="Fecharam" value={`${closeRate}%`} hint={countLabel(closed.length, "negócio", "negócios")} />
          <Score label="Não fecharam" value={`${lossRate}%`} hint={countLabel(lost.length, "perda", "perdas")} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Entregues" value={String(delivered.length)} hint={closed.length ? `${deliveryRate}% do que fechou` : "Nenhum fechamento ainda"} />
        <Metric label="Ticket do interesse" value={average(interestPrices)} hint={interestPrices.length ? `${interestPrices.length} com preço` : "Sem preço no estoque"} />
        <Metric label="Ticket fechado" value={average(closedPrices)} hint={sum(closedPrices)} />
        <Metric
          label="A pagar sobre a FIPE"
          value={offerVsFipe == null ? "—" : `${offerVsFipe}%`}
          hint={offerVsFipe == null ? (appraisals.length ? "Falta valor a pagar ou FIPE" : "Nenhuma avaliação") : "Média do valor a pagar dividido pela FIPE"}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Cadeia</p>
          <h3 className="text-base font-semibold">Até onde o movimento chegou</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5">
          {chain.map((step, index) => {
            const previous = index === 0 ? step.value : chain[index - 1].value;
            const advanced = index === 0 ? 100 : percent(step.value, previous);
            const width = visible.length === 0 ? 0 : Math.max(step.value === 0 ? 0 : 8, Math.round((step.value / visible.length) * 100));
            return (
              <div key={step.name} className="border-border px-4 py-4 sm:border-l sm:first:border-l-0">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">{step.value}</p>
                <p className="text-sm font-medium">{step.name}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{index === 0 ? "Porta" : `${advanced}% do passo anterior`}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Fila</p>
          <h3 className="text-base font-semibold">Onde está cada etapa</h3>
          {stagesNow.map((stage) => (
            <div key={stage.stage} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-border">
              <span className="text-sm">{stage.name}</span>
              <span className="text-sm font-semibold tabular-nums">
                {stage.atendimentos}
                <span className="ml-2 font-normal text-muted-foreground">· {stage.pessoas} pess.</span>
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Corrigir a rota</p>
          <h3 className="text-base font-semibold">Quem está esperando</h3>
          {stuck.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma ficha aberta.
            </p>
          ) : (
            stuck.map((item) => (
              <div
                key={item.visit.id}
                className={`flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ${
                  item.late ? "ring-rose-300" : "ring-border"
                }`}
              >
                <p className={`w-24 shrink-0 text-lg font-semibold whitespace-nowrap tabular-nums ${item.late ? "text-rose-700" : ""}`}>
                  {item.visit.stage === "AWAITING_DELIVERY" && item.visit.delivery?.pickupOn
                    ? formatDateKey(item.visit.delivery.pickupOn)
                    : clockReady
                      ? formatWait(item.waited)
                      : "—"}
                </p>
                <div className="min-w-0">
                  <p className="font-semibold">{item.visit.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Movimento</p>
        <h3 className="text-base font-semibold">De onde veio, quem atendeu e o que pesou</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Vendedores" description="Quem está atendendo, quem fecha e quem perde.">
          {sellers.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sellers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="abertos" name="Em andamento" fill={COLORS.orange} radius={[6, 6, 0, 0]} />
                <Bar dataKey="fecharam" name="Fecharam" fill={COLORS.green} radius={[6, 6, 0, 0]} />
                <Bar dataKey="perdidos" name="Não fecharam" fill={COLORS.red} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Chegadas por hora" description="O ritmo da porta. Vale para reforçar recepção ou vendedor.">
          {hours.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="atendimentos" name="Atendimentos" fill={COLORS.navy} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pessoas" name="Pessoas" fill={COLORS.blue} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Como ficou sabendo" description="A origem que está trazendo gente para o feirão.">
          <CategoryChart rows={awareness} color={COLORS.orange} />
        </ChartCard>

        <ChartCard title="Veículos de maior interesse" description="O que o cliente escolheu como principal.">
          <CategoryChart rows={vehicles} color={COLORS.navy} />
        </ChartCard>

        <ChartCard title="Por que não fechou" description="O motivo registrado para o resgate.">
          <CategoryChart rows={reasons} color={COLORS.red} />
        </ChartCard>

        <ChartCard title="Bancos que fecharam" description="Onde o F&I está aprovando.">
          <CategoryChart rows={banks} color={COLORS.green} />
        </ChartCard>
      </div>
    </div>
  );
}

function isOpenStage(stage: FairVisitStage): stage is (typeof OPEN_STAGES)[number] {
  return (OPEN_STAGES as readonly FairVisitStage[]).includes(stage);
}

function isClosed(visit: FloorVisitDto) {
  return visit.stage === "AWAITING_DELIVERY" || visit.stage === "DELIVERED";
}

function reachedAppraisal(visit: FloorVisitDto) {
  return visit.appraisal != null || visit.stage === "IN_APPRAISAL";
}

function reachedFinance(visit: FloorVisitDto) {
  return (
    visit.transferredToFinanceAt != null ||
    visit.stage === "WITH_FINANCE" ||
    visit.stage === "AWAITING_DELIVERY" ||
    visit.stage === "DELIVERED"
  );
}

function reachedDelivery(visit: FloorVisitDto) {
  return visit.deliveryRequestedAt != null || visit.stage === "AWAITING_DELIVERY" || visit.stage === "DELIVERED";
}

function stageStartedAt(visit: FloorVisitDto) {
  if (visit.stage === "IN_APPRAISAL") return visit.appraisalRequestedAt ?? visit.checkedInAt;
  if (visit.stage === "WITH_FINANCE") return visit.transferredToFinanceAt ?? visit.checkedInAt;
  if (visit.stage === "AWAITING_DELIVERY") return visit.deliveryRequestedAt ?? visit.checkedInAt;
  return visit.checkedInAt;
}

function minutesSince(iso: string, now: number) {
  if (now === 0) return 0;
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
}

function formatWait(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}min`;
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function priceOf(visit: FloorVisitDto) {
  if (visit.delivery?.priceCents != null) return visit.delivery.priceCents;
  return visit.interests.find((item) => item.primary)?.vehicle.priceCents ?? null;
}

function average(values: number[]) {
  if (values.length === 0) return "—";
  return formatBrlFromCents(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function sum(values: number[]) {
  if (values.length === 0) return "Sem preço lançado";
  return `${formatBrlFromCents(values.reduce((total, value) => total + value, 0))} em estoque`;
}

function sellerRows(visits: FloorVisitDto[]) {
  return [...new Set(visits.map((visit) => visit.seller.name))].map((name) => {
    const own = visits.filter((visit) => visit.seller.name === name);
    return {
      name,
      abertos: own.filter((visit) => isOpenStage(visit.stage)).length,
      fecharam: own.filter(isClosed).length,
      perdidos: own.filter((visit) => visit.stage === "LOST").length,
    };
  });
}

function countRows(visits: FloorVisitDto[], pick: (visit: FloorVisitDto) => string) {
  const counts = visits.reduce<Record<string, number>>((map, visit) => {
    const key = pick(visit);
    map[key] = (map[key] ?? 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
}

function vehicleRows(visits: FloorVisitDto[]) {
  const counts = new Map<string, number>();
  for (const visit of visits) {
    const primary = visit.interests.find((item) => item.primary);
    if (!primary) continue;
    const name = vehicleTitle(primary.vehicle);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
}

function hourRows(visits: FloorVisitDto[]) {
  const counts = new Map<number, { atendimentos: number; pessoas: number }>();
  for (const visit of visits) {
    const hour = hourInAppTz(visit.checkedInAt);
    const current = counts.get(hour) ?? { atendimentos: 0, pessoas: 0 };
    current.atendimentos += 1;
    current.pessoas += peopleInVisit(visit.companionCount);
    counts.set(hour, current);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([hour, value]) => ({ hour: `${String(hour).padStart(2, "0")}h`, ...value }));
}

function arrivalDays(visits: FloorVisitDto[], today: string) {
  const counts = new Map<string, number>();
  for (const visit of visits) {
    const key = dateKeyInAppTz(visit.checkedInAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (today && !counts.has(today)) counts.set(today, 0);
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ key, count, label: dayChipLabel(key, today) }));
}

function dayChipLabel(key: string, today: string) {
  if (today && key === today) return "Hoje";
  const [year, month, day] = key.split("-");
  const date = new Date(`${key}T12:00:00-04:00`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIMEZONE, weekday: "short" })
    .format(date)
    .replace(".", "");
  const sameYear = today ? year === today.slice(0, 4) : true;
  return `${weekday} ${day}/${month}${sameYear ? "" : `/${year}`}`;
}

function DayChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
        active ? "bg-brand-navy text-white ring-brand-navy" : "bg-white text-foreground ring-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Score({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border-t border-white/10 px-5 py-4 sm:border-t-0 sm:border-l sm:first:border-l-0">
      <p className="text-[11px] font-medium tracking-[0.12em] text-white/50 uppercase whitespace-nowrap">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-white/60">{hint}</p>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CategoryChart({ rows, color }: { rows: { name: string; value: number }[]; color: string }) {
  if (rows.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" name="Quantidade" fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return <p className="py-10 text-center text-sm text-muted-foreground">Sem movimento ainda.</p>;
}
