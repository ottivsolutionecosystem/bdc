"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { PlateBadge } from "@/components/floor/floor-chrome";
import { MoneyField } from "@/components/floor/money-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBrlFromCents, parseReais, VEHICLE_BODY_TYPES, VEHICLE_CONDITIONS, VEHICLE_TRANSMISSIONS } from "@/lib/floor-labels";
import type { FloorVehicleDto } from "@/types/floor";

const emptyForm = {
  brand: "",
  model: "",
  version: "",
  year: "",
  plate: "",
  color: "",
  priceReais: "",
  condition: "",
  transmission: "",
  bodyType: "",
  mileageKm: "",
  onPromotion: false,
};

export function FloorStock({ eventId, vehicles }: { eventId: string; vehicles: FloorVehicleDto[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(vehicles.length === 0);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const normalized = query.trim().toLowerCase();

  const available = vehicles.filter((vehicle) => vehicle.active).length;
  const hidden = vehicles.length - available;
  const visible = useMemo(() => {
    return vehicles
      .filter((vehicle) => {
        if (!normalized) return true;
        return [vehicle.brand, vehicle.model, vehicle.version, vehicle.year, vehicle.plate, vehicle.color]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((left, right) => Number(right.active) - Number(left.active) || left.brand.localeCompare(right.brand));
  }, [vehicles, normalized]);

  function setField(key: keyof typeof emptyForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}/vehicles`, {
        method: "POST",
        body: JSON.stringify({
          brand: form.brand,
          model: form.model,
          version: form.version,
          plate: form.plate,
          color: form.color,
          year: form.year ? Number(form.year) : null,
          priceReais: parseReais(form.priceReais),
          condition: form.condition,
          transmission: form.transmission,
          bodyType: form.bodyType,
          mileageKm: form.mileageKm ? Number(form.mileageKm) : null,
          onPromotion: form.onPromotion,
        }),
      });
      toast.success("Veículo adicionado ao estoque.");
      setForm(emptyForm);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(vehicle: FloorVehicleDto) {
    try {
      await floorRequest(`/api/floor/vehicles/${vehicle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !vehicle.active }),
      });
      toast.success(vehicle.active ? "Veículo oculto da venda." : "Veículo de volta ao estoque.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Estoque</p>
          <h2 className="text-2xl font-semibold tracking-tight">O que a venda pode mostrar</h2>
          <p className="text-sm text-muted-foreground">
            {available} {available === 1 ? "disponível" : "disponíveis"}
            {hidden > 0 ? ` · ${hidden} ${hidden === 1 ? "oculto" : "ocultos"}` : ""}
          </p>
        </div>
        <Button type="button" variant={open ? "outline" : "default"} onClick={() => setOpen((current) => !current)}>
          {open ? "Fechar cadastro" : "Cadastrar veículo"}
        </Button>
      </div>

      {open ? (
        <form
          className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Marca" value={form.brand} onChange={(value) => setField("brand", value)} />
            <Field label="Modelo" value={form.model} onChange={(value) => setField("model", value)} />
            <Field label="Versão" value={form.version} onChange={(value) => setField("version", value)} />
            <Field label="Ano" value={form.year} onChange={(value) => setField("year", value)} />
            <Field label="Placa" value={form.plate} onChange={(value) => setField("plate", value.toUpperCase())} />
            <Field label="Cor" value={form.color} onChange={(value) => setField("color", value)} />
            <div className="sm:col-span-2">
              <MoneyField label="Preço" value={form.priceReais} onChange={(value) => setField("priceReais", value)} />
            </div>
            <Choice label="Condição" value={form.condition} options={VEHICLE_CONDITIONS} onChange={(value) => setField("condition", value)} />
            <Choice label="Câmbio" value={form.transmission} options={VEHICLE_TRANSMISSIONS} onChange={(value) => setField("transmission", value)} />
            <Choice label="Carroceria" value={form.bodyType} options={VEHICLE_BODY_TYPES} onChange={(value) => setField("bodyType", value)} />
            <Field label="Quilometragem" value={form.mileageKm} onChange={(value) => setField("mileageKm", value.replace(/\D/g, ""))} />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox checked={form.onPromotion} onCheckedChange={(checked) => setField("onPromotion", checked === true)} />
              Em promoção
            </label>
          </div>
          <Button type="submit" disabled={submitting || !form.brand.trim() || !form.model.trim()}>
            {submitting ? "Salvando..." : "Adicionar ao estoque"}
          </Button>
        </form>
      ) : null}

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por modelo, placa ou cor"
        className="h-11 bg-white"
      />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <p className="font-semibold">{vehicles.length === 0 ? "Estoque vazio" : "Nenhum veículo nessa busca"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicles.length === 0
              ? "Cadastre o que está no pátio para o vendedor marcar o interesse."
              : "Tente outra placa, modelo ou cor."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((vehicle) => (
            <article
              key={vehicle.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm ${
                vehicle.active ? "border-border" : "border-dashed border-border opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">{vehicle.brand}</p>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {vehicle.model}
                    {vehicle.version ? <span className="font-normal text-muted-foreground"> {vehicle.version}</span> : null}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[
                      vehicle.year,
                      vehicle.color,
                      vehicle.condition,
                      vehicle.transmission,
                      vehicle.bodyType,
                      vehicle.mileageKm == null ? null : `${vehicle.mileageKm.toLocaleString("pt-BR")} km`,
                      vehicle.onPromotion ? "Promoção" : null,
                      vehicle.active ? null : "Oculto da venda",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 text-right text-lg font-semibold tabular-nums">{formatBrlFromCents(vehicle.priceCents)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {vehicle.plate ? <PlateBadge plate={vehicle.plate} /> : <span className="text-sm text-muted-foreground">Sem placa</span>}
                <Button type="button" variant="outline" size="sm" onClick={() => toggle(vehicle)}>
                  {vehicle.active ? "Ocultar" : "Reativar"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "nenhum"} onValueChange={(next) => onChange(next === "nenhum" ? "" : next)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nenhum">Não informado</SelectItem>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
