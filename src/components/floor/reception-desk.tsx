"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { VisitSummary } from "@/components/floor/visit-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AWARENESS_LABELS, peopleInVisit } from "@/lib/floor-labels";
import type { FloorLookupDto, FloorPerson, FloorVisitDto } from "@/types/floor";

const emptyForm = {
  name: "",
  phone: "",
  companionCount: "0",
  awarenessSource: "PASSING_BY",
  receptionistId: "",
  sellerId: "",
  notes: "",
};

function receptionistDefault(receptionists: FloorPerson[], currentUserId?: string) {
  if (currentUserId && receptionists.some((person) => person.id === currentUserId)) return currentUserId;
  if (receptionists.length === 1) return receptionists[0].id;
  return "";
}

export function ReceptionDesk({
  eventId,
  sellers,
  receptionists,
  currentUserId,
  visits,
}: {
  eventId: string;
  sellers: FloorPerson[];
  receptionists: FloorPerson[];
  currentUserId?: string;
  visits: FloorVisitDto[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...emptyForm,
    receptionistId: receptionistDefault(receptionists, currentUserId),
  });
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busySellerIds = useMemo(
    () => new Set(visits.filter((visit) => visit.stage === "WITH_SELLER").map((visit) => visit.seller.id)),
    [visits],
  );
  const available = sellers.filter((seller) => !busySellerIds.has(seller.id));

  useEffect(() => {
    if (form.sellerId && busySellerIds.has(form.sellerId)) {
      setForm((current) => ({ ...current, sellerId: "" }));
    }
  }, [busySellerIds, form.sellerId]);

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLookup() {
    if (!form.phone) {
      toast.error("Informe o telefone.");
      return;
    }
    const params = new URLSearchParams();
    params.set("phone", form.phone);
    try {
      const result = (await floorRequest(`/api/floor/lookup?${params.toString()}`)) as FloorLookupDto;
      if (!result.found || !result.customer) {
        setHint("Nenhum cadastro encontrado. O cliente entra como novo.");
        return;
      }
      setForm((current) => ({
        ...current,
        name: result.customer?.name ?? current.name,
        phone: result.customer?.phone ?? current.phone,
        awarenessSource: result.suggestion ? "CALL_CAMPAIGN" : current.awarenessSource,
      }));
      setHint(
        result.suggestion
          ? `Cliente da campanha ${result.suggestion.campaignName ?? ""}${
              result.suggestion.lastVehicle ? ` · último veículo ${result.suggestion.lastVehicle}` : ""
            }`
          : "Cliente já cadastrado. Confira os dados antes de registrar."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível buscar.");
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}/visits`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          companionCount: Number(form.companionCount || 0),
        }),
      });
      toast.success("Cliente registrado e enviado ao vendedor.");
      setForm({ ...emptyForm, receptionistId: receptionistDefault(receptionists, currentUserId) });
      setHint(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setSubmitting(false);
    }
  }

  const companions = Number(form.companionCount || 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>Nova chegada</CardTitle>
          <CardDescription>
            O telefone puxa o cadastro. A recepcionista fica vinculada ao cliente, e a ficha só vai para um vendedor livre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <StepLabel n="1" label="Telefone" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="(00) 00000-0000"
                className="h-12 text-lg"
              />
              <Button type="button" variant="outline" className="h-12" onClick={handleLookup}>
                Buscar cadastro
              </Button>
            </div>
          </div>
          {hint ? <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">{hint}</p> : null}
          <div className="space-y-3">
            <StepLabel n="2" label="Quem entrou" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companions">Pessoas junto</Label>
              <Input
                id="companions"
                type="number"
                min={0}
                max={30}
                value={form.companionCount}
                onChange={(event) => setField("companionCount", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {peopleInVisit(Number.isFinite(companions) ? companions : 0) === 1
                  ? "Entra 1 pessoa no movimento."
                  : `Entram ${peopleInVisit(Number.isFinite(companions) ? companions : 0)} pessoas no movimento.`}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Recepcionista</Label>
              <Select value={form.receptionistId} onValueChange={(value) => setField("receptionistId", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Quem recebeu" />
                </SelectTrigger>
                <SelectContent>
                  {receptionists.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={form.sellerId} onValueChange={(value) => setField("sellerId", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Vendedor livre" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => {
                    const busy = busySellerIds.has(seller.id);
                    return (
                      <SelectItem key={seller.id} value={seller.id} disabled={busy}>
                        {busy ? `${seller.name} · Em atendimento` : seller.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <FieldSelect label="Como ficou sabendo" value={form.awarenessSource} labels={AWARENESS_LABELS} onChange={(value) => setField("awarenessSource", value)} />
          </div>
          </div>
          <div className="space-y-2">
            <StepLabel n="3" label="Observação para o vendedor" />
            <Textarea id="notes" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>
          <Button
            type="button"
            disabled={submitting || receptionists.length === 0 || !form.receptionistId || available.length === 0 || !form.sellerId}
            onClick={handleSubmit}
          >
            {submitting ? "Registrando..." : "Registrar e chamar vendedor"}
          </Button>
          {receptionists.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cadastre uma recepcionista em Usuários para vincular a chegada.</p>
          ) : null}
          {sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cadastre um vendedor em Usuários para conseguir encaminhar.</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os vendedores estão em atendimento.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quem entrou</CardTitle>
          <CardDescription>{visits.length === 1 ? "1 atendimento neste feirão." : `${visits.length} atendimentos neste feirão.`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma chegada neste feirão.</p>
          ) : (
            visits.slice(0, 12).map((visit) => (
              <div key={visit.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <VisitSummary visit={visit} compact />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">{n}</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  labels: Record<string, string>;
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
          {Object.entries(labels).map(([key, itemLabel]) => (
            <SelectItem key={key} value={key}>
              {itemLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
