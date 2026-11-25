"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { EmptyLane, WorkTicket } from "@/components/floor/floor-chrome";
import { VisitSummary } from "@/components/floor/visit-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateKey } from "@/lib/datetime";
import { DELIVERY_STATUS_LABELS } from "@/lib/floor-labels";
import type { FloorVisitDto } from "@/types/floor";

export function DeliveryDesk({ visits }: { visits: FloorVisitDto[] }) {
  const waiting = visits.filter((visit) => visit.stage === "AWAITING_DELIVERY" && visit.delivery);
  const atEvent = waiting.filter((visit) => !visit.delivery?.pickupOn);
  const scheduled = waiting
    .filter((visit) => visit.delivery?.pickupOn)
    .sort((left, right) => (left.delivery?.pickupOn ?? "").localeCompare(right.delivery?.pickupOn ?? ""));
  const done = visits.filter((visit) => visit.stage === "DELIVERED").slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-3">
          <LaneTitle title="No evento" count={atEvent.length} detail="Saem ainda hoje." />
          {atEvent.length === 0 ? (
            <EmptyLane title="Fila do dia vazia" detail="Quando o F&I fechar com entrega no evento, o veículo aparece aqui." />
          ) : (
            atEvent.map((visit) => <DeliveryCard key={visit.id} visit={visit} />)
          )}
        </section>
        <section className="space-y-3">
          <LaneTitle title="Retirada marcada" count={scheduled.length} detail="O cliente volta na data." />
          {scheduled.length === 0 ? (
            <EmptyLane title="Nenhuma data marcada" detail="Fechamentos com retirada agendada ficam nesta coluna, na ordem do dia." />
          ) : (
            scheduled.map((visit) => <DeliveryCard key={visit.id} visit={visit} />)
          )}
        </section>
      </div>
      {done.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Entregues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {done.map((visit) => (
              <VisitSummary key={visit.id} visit={visit} compact />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DeliveryCard({ visit }: { visit: FloorVisitDto }) {
  const delivery = visit.delivery!;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function advance(action: "start" | "finish") {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/deliveries/${delivery.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      toast.success(
        action === "finish" ? (delivery.pickupOn ? "Retirada concluída." : "Entrega concluída.") : "Entrega assumida.",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a entrega.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkTicket visit={visit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            {delivery.pickupOn ? `Retirada ${formatDateKey(delivery.pickupOn)}` : "Sai hoje"}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{delivery.vehicleTitle}</p>
          <p className="text-sm text-muted-foreground">
            {DELIVERY_STATUS_LABELS[delivery.status]}
            {delivery.assignee ? ` · ${delivery.assignee.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {delivery.status === "QUEUED" ? (
            <Button type="button" variant="outline" disabled={submitting} onClick={() => advance("start")}>
              Assumir
            </Button>
          ) : null}
          <Button type="button" disabled={submitting} onClick={() => advance("finish")}>
            {delivery.pickupOn ? "Confirmar retirada" : "Confirmar entrega"}
          </Button>
        </div>
      </div>
    </WorkTicket>
  );
}

function LaneTitle({ title, detail, count }: { title: string; detail: string; count: number }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{count}</p>
    </div>
  );
}
