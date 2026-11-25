"use client";

import type { ReactNode } from "react";

import { AppraisalDesk } from "@/components/floor/appraisal-desk";
import { DeliveryDesk } from "@/components/floor/delivery-desk";
import { FinanceDesk } from "@/components/floor/finance-desk";
import { DeskBanner } from "@/components/floor/floor-chrome";
import { FloorControl } from "@/components/floor/floor-control";
import { FloorCustomerBase } from "@/components/floor/floor-customer-base";
import { FloorDashboard } from "@/components/floor/floor-dashboard";
import { FloorStock } from "@/components/floor/floor-stock";
import { ReceptionDesk } from "@/components/floor/reception-desk";
import { SellerDesk } from "@/components/floor/seller-desk";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FairEventStatus, FairVisitStage, UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { FloorControlDto, FloorPerson, FloorVehicleDto, FloorVisitDto } from "@/types/floor";

const ROLE_TAB: Partial<Record<UserRole, string>> = {
  RECEPTIONIST: "reception",
  SELLER: "seller",
  APPRAISER: "appraisal",
  FINANCE: "finance",
  DELIVERY: "delivery",
};

export function FloorWorkspace({
  role,
  eventId,
  sellers,
  receptionists,
  currentUserId,
  busySellerIds,
  financeUsers,
  vehicles,
  visits,
  control,
  staff,
  eventStatus,
}: {
  role: UserRole;
  eventId: string;
  sellers: FloorPerson[];
  receptionists: FloorPerson[];
  currentUserId?: string;
  busySellerIds: string[];
  financeUsers: FloorPerson[];
  vehicles: FloorVehicleDto[];
  visits: FloorVisitDto[];
  control: FloorControlDto | null;
  staff: FloorPerson[];
  eventStatus: FairEventStatus;
}) {
  const manager = role === "ADMIN" || role === "SUPERVISOR";
  const stock = vehicles;
  const available = vehicles.filter((item) => item.active);

  if (!manager) {
    const tab = ROLE_TAB[role];
    const banner = bannerFor(tab, visits);
    return (
      <div className="space-y-5">
        {banner ? <DeskBanner {...banner} /> : null}
        {tab === "reception" ? (
          <ReceptionDesk
            eventId={eventId}
            sellers={sellers}
            receptionists={receptionists}
            currentUserId={currentUserId}
            visits={visits}
          />
        ) : null}
        {tab === "seller" ? (
          <SellerDesk
            visits={visits}
            vehicles={available}
            sellers={sellers}
            viewerSellerId={currentUserId}
            busySellerIds={busySellerIds}
          />
        ) : null}
        {tab === "appraisal" ? <AppraisalDesk visits={visits} /> : null}
        {tab === "finance" ? <FinanceDesk visits={visits} financeUsers={financeUsers} vehicles={available} /> : null}
        {tab === "delivery" ? <DeliveryDesk visits={visits} /> : null}
      </div>
    );
  }

  const chain = [
    { value: "reception", label: "Recepção", count: 0 },
    { value: "seller", label: "Vendas", count: countStage(visits, "WITH_SELLER") },
    { value: "appraisal", label: "Avaliação", count: countStage(visits, "IN_APPRAISAL") },
    { value: "finance", label: "F&I", count: countStage(visits, "WITH_FINANCE") },
    { value: "delivery", label: "Entrega", count: countStage(visits, "AWAITING_DELIVERY") },
  ];

  return (
    <Tabs defaultValue="dashboard" className="gap-6">
      <div className="overflow-hidden rounded-2xl bg-brand-navy text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase">Cadeia do feirão</p>
          <TabsList className="h-auto w-auto gap-1 bg-transparent p-0">
            <QuietTab value="dashboard">Painel</QuietTab>
            <QuietTab value="base">Base</QuietTab>
            <QuietTab value="stock">Estoque</QuietTab>
            {control ? <QuietTab value="control">Controle</QuietTab> : null}
          </TabsList>
        </div>
        <TabsList className="grid h-auto grid-cols-2 gap-px border-t border-white/10 bg-white/10 p-0 sm:grid-cols-5">
          {chain.map((item, index) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group h-auto flex-col items-start justify-between gap-3 rounded-none border-0 bg-brand-navy px-4 py-4 text-left text-white shadow-none hover:bg-white/5 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <span className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase group-data-[state=active]:text-white/80">
                0{index + 1}
              </span>
              <span className="flex w-full items-end justify-between gap-2">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-2xl font-semibold tabular-nums leading-none">{item.count}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="dashboard">
        <FloorDashboard visits={visits} />
      </TabsContent>
      <TabsContent value="base">
        <FloorCustomerBase visits={visits} />
      </TabsContent>
      <TabsContent value="reception">
        <ReceptionDesk
          eventId={eventId}
          sellers={sellers}
          receptionists={receptionists}
          currentUserId={currentUserId}
          visits={visits}
        />
      </TabsContent>
      <TabsContent value="seller">
        <SellerDesk visits={visits} vehicles={available} sellers={sellers} busySellerIds={busySellerIds} />
      </TabsContent>
      <TabsContent value="appraisal">
        <AppraisalDesk visits={visits} />
      </TabsContent>
      <TabsContent value="finance">
        <FinanceDesk visits={visits} financeUsers={financeUsers} vehicles={available} />
      </TabsContent>
      <TabsContent value="delivery">
        <DeliveryDesk visits={visits} />
      </TabsContent>
      <TabsContent value="stock">
        <FloorStock eventId={eventId} vehicles={stock} />
      </TabsContent>
      {control ? (
        <TabsContent value="control">
          <FloorControl
            eventId={eventId}
            status={eventStatus}
            canEdit={role === "ADMIN"}
            staff={staff}
            tasks={control.tasks}
            expenses={control.expenses}
            projection={control.projection}
            visits={visits}
          />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

function countStage(visits: FloorVisitDto[], stage: FairVisitStage) {
  return visits.filter((visit) => visit.stage === stage).length;
}

function QuietTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "h-8 flex-none rounded-full border border-transparent bg-transparent px-3 text-white/70 shadow-none hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:text-brand-navy",
      )}
    >
      {children}
    </TabsTrigger>
  );
}

function bannerFor(tab: string | undefined, visits: FloorVisitDto[]) {
  if (tab === "reception") {
    return {
      eyebrow: "Recepção",
      title: "Quem está chegando",
      description: "Busque o telefone, confirme o grupo e chame o vendedor.",
      count: visits.length,
    };
  }
  if (tab === "seller") {
    return {
      eyebrow: "Vendas",
      title: "Clientes com você",
      description: "Marque o interesse e decida: avaliar a troca ou enviar ao F&I.",
      count: countStage(visits, "WITH_SELLER"),
    };
  }
  if (tab === "appraisal") {
    return {
      eyebrow: "Avaliação",
      title: "Carros na troca",
      description: "FIPE, valor a pagar e gasto previsto formam o parecer do carro pronto.",
      count: countStage(visits, "IN_APPRAISAL"),
    };
  }
  if (tab === "finance") {
    return {
      eyebrow: "F&I",
      title: "Fechamentos",
      description: "Escolha o banco e a saída do veículo. A ficha só entra aqui quando a venda libera.",
      count: countStage(visits, "WITH_FINANCE"),
    };
  }
  if (tab === "delivery") {
    return {
      eyebrow: "Entrega",
      title: "Saída dos veículos",
      description: "Uma fila para quem leva hoje e outra para quem volta na data combinada.",
      count: countStage(visits, "AWAITING_DELIVERY"),
    };
  }
  return null;
}
