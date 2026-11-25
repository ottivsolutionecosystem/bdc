"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { compressPhoto } from "@/lib/compress-photo";
import { MoneyField } from "@/components/floor/money-field";
import { EmptyLane, TicketSection, WorkTicket } from "@/components/floor/floor-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIXED_PHOTO_SLOTS,
  MECHANICAL_DEFECTS,
  PHOTO_SLOT_LABELS,
  TIRE_CONDITION_LABELS,
  TIRE_FIELDS,
  formatBrlFromCents,
  formatReaisInput,
  parseReais,
  preparedVehicleCents,
  reaisToCents,
} from "@/lib/floor-labels";
import type { FloorVisitDto } from "@/types/floor";

type TireValue = "" | "GOOD" | "HALF" | "REPLACE";
type CostKind = "DAMAGE" | "MECHANICAL";
type CostLine = { key: string; label: string; amount: string; custom: boolean };

const MECHANICAL_NAMES: readonly string[] = MECHANICAL_DEFECTS;

function savedLines(costs: { kind: CostKind; label: string; costCents: number }[], kind: CostKind): CostLine[] {
  return costs
    .filter((item) => item.kind === kind)
    .map((item, index) => ({
      key: `${kind.toLowerCase()}-${index}`,
      label: item.label,
      amount: item.costCents > 0 ? formatReaisInput(item.costCents) : "",
      custom: kind === "MECHANICAL" && !MECHANICAL_NAMES.includes(item.label),
    }));
}

function lineCents(lines: CostLine[]) {
  return lines.reduce((total, line) => {
    const reais = parseReais(line.amount);
    if (reais == null || reais <= 0) return total;
    return total + reaisToCents(reais);
  }, 0);
}

function damageDraftsFrom(photos: { id: string; slot: string; caption: string | null; costCents: number | null }[]) {
  return Object.fromEntries(
    photos
      .filter((photo) => photo.slot === "DAMAGE")
      .map((photo) => [
        photo.id,
        {
          label: photo.caption ?? "",
          amount: photo.costCents != null && photo.costCents > 0 ? formatReaisInput(photo.costCents) : "",
        },
      ]),
  );
}

function toCostPayload(kind: CostKind, lines: CostLine[]) {
  return lines
    .filter((line) => line.label.trim().length > 0 || parseReais(line.amount) != null)
    .map((line) => ({
      kind,
      label: line.label.trim(),
      costReais: parseReais(line.amount),
    }));
}

const TIRE_OPTIONS = ["GOOD", "HALF", "REPLACE"] as const;

export function AppraisalDesk({ visits }: { visits: FloorVisitDto[] }) {
  const queue = visits.filter((visit) => visit.stage === "IN_APPRAISAL" && visit.appraisal);
  return (
    <div className="space-y-5">
      {queue.length === 0 ? (
        <EmptyLane
          title="Nenhuma troca na fila"
          detail="Quando o vendedor informar a placa, a ficha abre aqui para o parecer técnico."
        />
      ) : (
        queue.map((visit) => <AppraisalCard key={visit.id} visit={visit} />)
      )}
    </div>
  );
}

function AppraisalCard({ visit }: { visit: FloorVisitDto }) {
  const appraisal = visit.appraisal!;
  const router = useRouter();
  const [form, setForm] = useState({
    plate: appraisal.plate,
    brand: appraisal.brand ?? "",
    model: appraisal.model ?? "",
    year: appraisal.year?.toString() ?? "",
    fipeValueReais: appraisal.fipeValueCents != null ? formatReaisInput(appraisal.fipeValueCents) : "",
    offerValueReais: appraisal.offerValueCents != null ? formatReaisInput(appraisal.offerValueCents) : "",
    tireFrontLeft: (appraisal.tireFrontLeft ?? "") as TireValue,
    tireFrontRight: (appraisal.tireFrontRight ?? "") as TireValue,
    tireRearLeft: (appraisal.tireRearLeft ?? "") as TireValue,
    tireRearRight: (appraisal.tireRearRight ?? "") as TireValue,
    notes: appraisal.notes ?? "",
  });
  const [damageDrafts, setDamageDrafts] = useState(() => damageDraftsFrom(appraisal.photos));
  const [mechanicalLines, setMechanicalLines] = useState<CostLine[]>(() => savedLines(appraisal.costs, "MECHANICAL"));
  const [submitting, setSubmitting] = useState(false);
  const lineSeq = useRef(0);
  const damagePhotos = appraisal.photos.filter((photo) => photo.slot === "DAMAGE");
  const damageCents = lineCents(
    damagePhotos.map((photo) => ({
      key: photo.id,
      label: damageDrafts[photo.id]?.label ?? "",
      amount: damageDrafts[photo.id]?.amount ?? "",
      custom: false,
    })),
  );
  const mechanicalCents = lineCents(mechanicalLines);
  const preparationCents = damageCents + mechanicalCents > 0 ? damageCents + mechanicalCents : null;

  useEffect(() => {
    setDamageDrafts((current) => {
      const incoming = damageDraftsFrom(appraisal.photos);
      let changed = false;
      const next = { ...current };
      for (const [id, draft] of Object.entries(incoming)) {
        if (next[id]) continue;
        next[id] = draft;
        changed = true;
      }
      return changed ? next : current;
    });
  }, [appraisal.photos]);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function newKey(prefix: string) {
    lineSeq.current += 1;
    return `${prefix}-${lineSeq.current}`;
  }

  function updateLine(
    setter: Dispatch<SetStateAction<CostLine[]>>,
    key: string,
    patch: Partial<Pick<CostLine, "label" | "amount">>,
  ) {
    setter((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function payload(source: typeof form, finish: boolean) {
    return {
      plate: source.plate.replace(/[^a-zA-Z0-9]/g, ""),
      brand: source.brand,
      model: source.model,
      year: source.year ? Number(source.year) : null,
      fipeValueReais: parseReais(source.fipeValueReais),
      offerValueReais: parseReais(source.offerValueReais),
      costs: toCostPayload("MECHANICAL", mechanicalLines),
      damages: damagePhotos.map((photo) => ({
        photoId: photo.id,
        caption: damageDrafts[photo.id]?.label ?? "",
        costReais: parseReais(damageDrafts[photo.id]?.amount ?? ""),
      })),
      tireFrontLeft: source.tireFrontLeft || null,
      tireFrontRight: source.tireFrontRight || null,
      tireRearLeft: source.tireRearLeft || null,
      tireRearRight: source.tireRearRight || null,
      notes: source.notes,
      finish,
    };
  }

  async function save(finish: boolean) {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/appraisals/${appraisal.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload(form, finish)),
      });
      toast.success(finish ? "Avaliação concluída. Ficha enviada ao F&I." : "Avaliação salva.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function lookup() {
    setSubmitting(true);
    try {
      const result = await floorRequest(`/api/floor/plate?plate=${encodeURIComponent(form.plate)}`);
      if (!result.configured) {
        toast.error("A consulta de placa está sem token. Preencha a FIPE manualmente.");
        return;
      }
      if (result.fipeValueCents == null) {
        toast.error("A placa não retornou valor de FIPE. Preencha manualmente.");
        return;
      }
      const next = {
        ...form,
        plate: result.plate || form.plate,
        brand: result.brand ?? form.brand,
        model: result.model ?? form.model,
        year: result.year ? String(result.year) : form.year,
        fipeValueReais: formatReaisInput(result.fipeValueCents),
      };
      setForm(next);
      await floorRequest(`/api/floor/appraisals/${appraisal.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload(next, false)),
      });
      const vehicle = [result.brand, result.model, result.year].filter(Boolean).join(" ");
      toast.success(`FIPE ${formatBrlFromCents(result.fipeValueCents)}${vehicle ? ` · ${vehicle}` : ""}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function upload(slot: string, file: File) {
    const photo = await compressPhoto(file);
    const body = new FormData();
    body.set("file", photo);
    body.set("slot", slot);
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/appraisals/${appraisal.id}/photos`, { method: "POST", body });
      toast.success("Foto adicionada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setSubmitting(false);
    }
  }

  const identified = [form.brand, form.model, form.year].filter(Boolean).join(" ");

  return (
    <WorkTicket visit={visit}>
      <TicketSection kicker="01" title="O carro" hint="A consulta da placa preenche marca, modelo, ano e FIPE.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={form.plate}
            onChange={(event) => setField("plate", event.target.value.toUpperCase())}
            className="font-mono text-lg tracking-[0.14em] uppercase sm:max-w-48"
            aria-label="Placa"
          />
          <Button type="button" variant="outline" disabled={submitting} onClick={lookup}>
            Consultar FIPE
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_5.5rem]">
          <Field label="Marca" value={form.brand} onChange={(value) => setField("brand", value)} />
          <Field label="Modelo" value={form.model} onChange={(value) => setField("model", value)} />
          <Field label="Ano" value={form.year} onChange={(value) => setField("year", value)} />
        </div>
        {identified ? <p className="text-sm font-medium">{identified}</p> : null}
      </TicketSection>

      <TicketSection kicker="02" title="Valores" hint="O gasto previsto soma avarias e defeitos mecânicos. O carro pronto junta esse gasto ao valor a pagar.">
        <div className="grid gap-3 lg:grid-cols-[1fr_17rem]">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MoneyField id={`fipe-${appraisal.id}`} label="FIPE" value={form.fipeValueReais} onChange={(value) => setField("fipeValueReais", value)} />
            <MoneyField id={`pay-${appraisal.id}`} label="Valor a pagar" value={form.offerValueReais} onChange={(value) => setField("offerValueReais", value)} />
            <MoneyField
              id={`prep-${appraisal.id}`}
              label="Gasto previsto"
              value={preparationCents == null ? "" : formatReaisInput(preparationCents)}
              onChange={() => undefined}
              disabled
            />
          </div>
          <PreparedForecast payReais={form.offerValueReais} preparationCents={preparationCents} />
        </div>
      </TicketSection>

      <TicketSection kicker="03" title="Inspeção" hint="Fotos e pneus da inspeção. O valor de cada avaria e de cada defeito mecânico entra no gasto previsto.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FIXED_PHOTO_SLOTS.map((slot) => {
            const photo = appraisal.photos.find((item) => item.slot === slot);
            return (
              <label
                key={slot}
                className="relative flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-xl border border-dashed border-border bg-muted/40"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt={PHOTO_SLOT_LABELS[slot]} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Foto</span>
                )}
                <span className="relative bg-brand-navy/85 px-2 py-1.5 text-xs font-medium text-white">{PHOTO_SLOT_LABELS[slot]}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={submitting}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(slot, file);
                    event.target.value = "";
                  }}
                />
              </label>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIRE_FIELDS.map(([field, label]) => (
            <div key={field} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {TIRE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-md px-2 py-2 text-xs font-medium ${
                      form[field] === option ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-white"
                    }`}
                    onClick={() => setField(field, form[field] === option ? "" : option)}
                  >
                    {TIRE_CONDITION_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Avarias</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {damagePhotos.length}/15 fotos · {damageCents > 0 ? formatBrlFromCents(damageCents) : "sem valor"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">A foto abre o card. Descrição e valor ficam logo abaixo dela.</p>
          {damagePhotos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {damagePhotos.map((photo) => {
                const draft = damageDrafts[photo.id] ?? { label: "", amount: "" };
                return (
                  <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={draft.label || "Avaria"} className="aspect-[4/3] w-full object-cover" />
                    <div className="space-y-3 p-3">
                      <div className="space-y-2">
                        <Label htmlFor={`damage-label-${photo.id}`}>Descrição</Label>
                        <Input
                          id={`damage-label-${photo.id}`}
                          value={draft.label}
                          placeholder="O que avariou"
                          onChange={(event) =>
                            setDamageDrafts((current) => ({
                              ...current,
                              [photo.id]: { ...draft, label: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <MoneyField
                        id={`damage-value-${photo.id}`}
                        label="Valor"
                        value={draft.amount}
                        onChange={(value) =>
                          setDamageDrafts((current) => ({
                            ...current,
                            [photo.id]: { label: current[photo.id]?.label ?? "", amount: value },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-dashed border-border px-4 py-3 text-sm font-medium">
            Adicionar foto de avaria
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={submitting || damagePhotos.length >= 15}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload("DAMAGE", file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Defeitos mecânicos</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {mechanicalCents > 0 ? formatBrlFromCents(mechanicalCents) : "sem valor"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Selecione o defeito e informe o possível gasto. A soma entra no gasto previsto.</p>
          <div className="flex flex-wrap gap-2">
            {MECHANICAL_DEFECTS.map((name) => {
              const selected = mechanicalLines.some((line) => !line.custom && line.label === name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    setMechanicalLines((current) => {
                      const existing = current.find((line) => !line.custom && line.label === name);
                      if (existing) return current.filter((line) => line.key !== existing.key);
                      return [...current, { key: newKey("mechanical"), label: name, amount: "", custom: false }];
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    selected ? "bg-brand-navy text-white" : "bg-muted text-foreground"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          {mechanicalLines.length > 0 ? (
            <div className="space-y-2">
              {mechanicalLines.map((line) => (
                <CostRow
                  key={line.key}
                  labelPlaceholder="Nome do defeito"
                  amountLabel="Possível gasto"
                  line={line}
                  labelLocked={!line.custom}
                  onLabel={(value) => updateLine(setMechanicalLines, line.key, { label: value })}
                  onAmount={(value) => updateLine(setMechanicalLines, line.key, { amount: value })}
                  onRemove={() => setMechanicalLines((current) => current.filter((item) => item.key !== line.key))}
                />
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setMechanicalLines((current) => [...current, { key: newKey("mechanical"), label: "", amount: "", custom: true }])
            }
          >
            Outro defeito
          </Button>
        </div>
      </TicketSection>

      <TicketSection kicker="04" title="Parecer técnico" hint="O que pesou no valor a pagar e o que entra no gasto previsto.">
        <Textarea
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Estado do carro, o que pesou no valor a pagar e o que entra no gasto previsto."
          className="min-h-28"
        />
      </TicketSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {visit.interests.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:mr-auto">
            O vendedor ainda não anexou um veículo. A ficha só vai ao F&I com um carro marcado.
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => save(false)}>
            Salvar rascunho
          </Button>
          <Button type="button" disabled={submitting || visit.interests.length === 0} onClick={() => save(true)}>
            Concluir e enviar ao F&I
          </Button>
        </div>
      </div>
    </WorkTicket>
  );
}

function CostRow({
  line,
  labelPlaceholder,
  amountLabel,
  labelLocked,
  onLabel,
  onAmount,
  onRemove,
}: {
  line: CostLine;
  labelPlaceholder: string;
  amountLabel: string;
  labelLocked?: boolean;
  onLabel: (value: string) => void;
  onAmount: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_12.5rem_auto] sm:items-end">
      {labelLocked ? (
        <p className="text-sm font-medium sm:mb-3">{line.label}</p>
      ) : (
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input value={line.label} placeholder={labelPlaceholder} onChange={(event) => onLabel(event.target.value)} />
        </div>
      )}
      <MoneyField label={amountLabel} value={line.amount} onChange={onAmount} />
      <Button type="button" variant="ghost" onClick={onRemove}>
        Remover
      </Button>
    </div>
  );
}

function PreparedForecast({ payReais, preparationCents }: { payReais: string; preparationCents: number | null }) {
  const pay = parseReais(payReais);
  const prepared = preparedVehicleCents(pay == null ? null : reaisToCents(pay), preparationCents);
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-brand-navy px-4 py-4 text-white">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">Carro pronto</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{formatBrlFromCents(prepared)}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/60">Valor a pagar mais o gasto previsto. Fica anexo se a troca entrar.</p>
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
