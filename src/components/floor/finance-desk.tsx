"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppraisalDetailDialog } from "@/components/floor/appraisal-detail";
import { floorRequest } from "@/components/floor/floor-api";
import { HandoffVisit } from "@/components/floor/handoff-visit";
import { LoseVisitButton } from "@/components/floor/lose-visit-button";
import { EmptyLane, TicketSection, WorkTicket } from "@/components/floor/floor-chrome";
import { StockDialog } from "@/components/floor/seller-desk";
import { VisitSummary } from "@/components/floor/visit-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateKey, todayKeyInAppTz } from "@/lib/datetime";
import { FINANCE_BANKS, fipePayLabel, formatBrlFromCents, preparedVehicleCents, vehicleTitle } from "@/lib/floor-labels";
import type { FloorPerson, FloorVehicleDto, FloorVisitDto } from "@/types/floor";

const today = todayKeyInAppTz();

export function FinanceDesk({
  visits,
  financeUsers,
  vehicles,
}: {
  visits: FloorVisitDto[];
  financeUsers: FloorPerson[];
  vehicles: FloorVehicleDto[];
}) {
  const queue = visits.filter((visit) => visit.stage === "WITH_FINANCE");
  const done = visits
    .filter(
      (visit) =>
        visit.stage === "AWAITING_DELIVERY" ||
        visit.stage === "DELIVERED" ||
        (visit.stage === "LOST" && (visit.financeUser != null || visit.bankName != null || visit.transferredToFinanceAt != null)),
    )
    .slice(0, 8);

  return (
    <div className="space-y-5">
      {queue.length === 0 ? (
        <EmptyLane
          title="Nenhum fechamento agora"
          detail="A ficha chega aqui quando o vendedor envia direto ou quando a avaliação termina."
        />
      ) : (
        queue.map((visit) => <FinanceCard key={visit.id} visit={visit} financeUsers={financeUsers} vehicles={vehicles} />)
      )}
      {done.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {done.map((visit) => (
              <VisitSummary key={visit.id} visit={visit} compact />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FinanceCard({
  visit,
  financeUsers,
  vehicles,
}: {
  visit: FloorVisitDto;
  financeUsers: FloorPerson[];
  vehicles: FloorVehicleDto[];
}) {
  const router = useRouter();
  const primary = visit.interests.find((item) => item.primary) ?? visit.interests[0];
  const [bankName, setBankName] = useState<string>(FINANCE_BANKS[0]);
  const [vehicleId, setVehicleId] = useState(primary?.vehicleId ?? "");
  const [stockOpen, setStockOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [atEvent, setAtEvent] = useState(true);
  const [pickupOn, setPickupOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const outside = vehicles.find((vehicle) => vehicle.id === vehicleId && !visit.interests.some((item) => item.vehicleId === vehicle.id));

  function openStock() {
    setPicked(vehicleId ? { [vehicleId]: true } : {});
    setStockOpen(true);
  }

  function toggleClosed(id: string, checked: boolean) {
    setPicked(checked ? { [id]: true } : {});
  }

  function confirmClosed() {
    const id = Object.entries(picked).find(([, on]) => on)?.[0];
    if (!id) return;
    setVehicleId(id);
    setStockOpen(false);
  }

  async function closeDeal() {
    if (!vehicleId) {
      toast.error("Selecione o veículo que foi fechado.");
      return;
    }
    if (!atEvent && !pickupOn) {
      toast.error("Informe a data da retirada do veículo.");
      return;
    }
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visit.id}/close`, {
        method: "POST",
        body: JSON.stringify({ bankName, vehicleId, atEvent, pickupOn: atEvent ? null : pickupOn }),
      });
      toast.success(atEvent ? "Negócio fechado. Entrega no evento." : `Negócio fechado. Retirada em ${formatDateKey(pickupOn)}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar.");
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
            options={financeUsers.filter((person) => person.id !== visit.financeUser?.id)}
            label="Passar para outro F&I"
            emptyLabel="Cadastre outro F&I ativo para transferir este atendimento."
          />
          <LoseVisitButton visitId={visit.id} />
        </>
      }
    >
      <div className="space-y-5">
        {visit.appraisal ? (
          <>
            <button
              type="button"
              onClick={() => setAppraisalOpen(true)}
              className="w-full space-y-3 rounded-2xl bg-muted/60 p-4 text-left transition hover:bg-muted"
            >
              <p className="text-sm font-medium">
                Troca {visit.appraisal.plate}
                {visit.appraisal.brand ? ` · ${visit.appraisal.brand} ${visit.appraisal.model ?? ""}` : ""}
              </p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <AppraisalFigure label="FIPE" value={formatBrlFromCents(visit.appraisal.fipeValueCents)} />
                <AppraisalFigure
                  label="Valor a pagar"
                  value={formatBrlFromCents(visit.appraisal.offerValueCents)}
                  hint={fipePayLabel(visit.appraisal.offerValueCents, visit.appraisal.fipeValueCents)}
                />
                <AppraisalFigure label="Gasto previsto" value={formatBrlFromCents(visit.appraisal.preparationCostCents)} />
                <AppraisalFigure
                  label="Previsto pronto"
                  value={formatBrlFromCents(
                    preparedVehicleCents(visit.appraisal.offerValueCents, visit.appraisal.preparationCostCents),
                  )}
                />
              </dl>
              <p className="text-sm font-medium">Ver avaliação completa</p>
            </button>
            <AppraisalDetailDialog
              appraisal={visit.appraisal}
              customerName={visit.customer.name}
              open={appraisalOpen}
              onOpenChange={setAppraisalOpen}
            />
          </>
        ) : null}
        <TicketSection
          kicker="Fechar"
          title="Banco e saída"
          hint="Escolha o banco, o veículo que saiu e como o cliente leva o carro."
          action={
            <Button type="button" variant="outline" onClick={openStock}>
              {vehicleId ? "Trocar veículo" : "Escolher no estoque"}
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {FINANCE_BANKS.map((bank) => (
              <button
                key={bank}
                type="button"
                onClick={() => setBankName(bank)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  bankName === bank ? "bg-brand-navy text-white" : "bg-muted text-foreground"
                }`}
              >
                {bank}
              </button>
            ))}
          </div>
          {visit.interests.length > 0 || outside ? (
            <div className="grid gap-2">
              {visit.interests.map((interest) => (
                <button
                  key={interest.vehicleId}
                  type="button"
                  onClick={() => setVehicleId(interest.vehicleId)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    vehicleId === interest.vehicleId ? "border-primary bg-accent" : "border-border bg-white"
                  }`}
                >
                  <p className="font-medium">{vehicleTitle(interest.vehicle)}</p>
                  <p className="text-sm text-muted-foreground">
                    {interest.primary ? "Maior interesse · " : "Marcado na venda · "}
                    {formatBrlFromCents(interest.vehicle.priceCents)}
                  </p>
                </button>
              ))}
              {outside ? (
                <button
                  type="button"
                  onClick={() => setVehicleId(outside.id)}
                  className="rounded-xl border border-primary bg-accent px-4 py-3 text-left"
                >
                  <p className="font-medium">{vehicleTitle(outside)}</p>
                  <p className="text-sm text-muted-foreground">
                    Fora da lista de vendas · {formatBrlFromCents(outside.priceCents)}
                  </p>
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum veículo anexado. Escolha no estoque o carro que foi fechado.</p>
          )}
          <StockDialog
            open={stockOpen}
            vehicles={vehicles}
            selected={picked}
            primaryId={vehicleId}
            submitting={false}
            mode="closed"
            onOpenChange={setStockOpen}
            onToggle={toggleClosed}
            onPrimary={() => undefined}
            onConfirm={confirmClosed}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAtEvent(true)}
              className={`rounded-2xl border px-4 py-4 text-left ${atEvent ? "border-primary bg-accent" : "border-border"}`}
            >
              <p className="font-semibold">Entrega no evento</p>
              <p className="text-sm text-muted-foreground">Sai ainda hoje, na fila do feirão.</p>
            </button>
            <button
              type="button"
              onClick={() => setAtEvent(false)}
              className={`rounded-2xl border px-4 py-4 text-left ${atEvent ? "border-border" : "border-primary bg-accent"}`}
            >
              <p className="font-semibold">Agendar retirada</p>
              <p className="text-sm text-muted-foreground">O cliente volta em outra data.</p>
            </button>
          </div>
          {!atEvent ? (
            <div className="max-w-xs space-y-2">
              <Label htmlFor={`pickup-${visit.id}`}>Data da retirada</Label>
              <Input
                id={`pickup-${visit.id}`}
                type="date"
                min={today}
                value={pickupOn}
                onChange={(event) => setPickupOn(event.target.value)}
              />
            </div>
          ) : null}
          <Button type="button" disabled={submitting || !vehicleId || (!atEvent && !pickupOn)} onClick={closeDeal}>
            {atEvent ? "Fechar e entregar no evento" : "Fechar e agendar retirada"}
          </Button>
        </TicketSection>
      </div>
    </WorkTicket>
  );
}

function AppraisalFigure({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
