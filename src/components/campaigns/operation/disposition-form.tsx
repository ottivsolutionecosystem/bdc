"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { submitAttemptSchema, type SubmitAttemptInput } from "@/schemas/attempt";
import {
  DISPOSITION_CATEGORY_LABELS,
  PURCHASE_TIMELINE_LABELS,
  EVENT_INTEREST_LABELS,
} from "@/lib/campaign-labels";
import type { DispositionOption, Seller } from "@/types/campaign";
import type { DispositionCategory } from "@/generated/prisma/enums";

const CATEGORY_ORDER: DispositionCategory[] = ["POSITIVE", "CONVERSION", "FOLLOW_UP", "NO_INTEREST", "NOT_REACHED"];

export function DispositionForm({
  dispositions,
  sellers,
  onSubmit,
}: {
  dispositions: DispositionOption[];
  sellers: Seller[];
  onSubmit: (input: SubmitAttemptInput) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [wantsAppointment, setWantsAppointment] = useState(false);

  const form = useForm<SubmitAttemptInput>({
    resolver: zodResolver(submitAttemptSchema),
    defaultValues: { dispositionId: "", notes: "" },
  });

  const groupedDispositions = useMemo(() => {
    const groups = new Map<DispositionCategory, DispositionOption[]>();
    dispositions.forEach((d) => {
      const list = groups.get(d.category) ?? [];
      list.push(d);
      groups.set(d.category, list);
    });
    return CATEGORY_ORDER.filter((c) => groups.has(c)).map((category) => ({
      category,
      items: groups.get(category)!,
    }));
  }, [dispositions]);

  const selectedDispositionId = form.watch("dispositionId");
  const selectedDisposition = dispositions.find((d) => d.id === selectedDispositionId);
  const isFollowUp = selectedDisposition?.category === "FOLLOW_UP";
  const showQualification =
    selectedDisposition?.category === "POSITIVE" || selectedDisposition?.category === "CONVERSION";

  async function handleSubmit(values: SubmitAttemptInput) {
    if (isFollowUp && !values.nextContactAt) {
      form.setError("nextContactAt", { message: "Informe data e horário do próximo contato" });
      return;
    }
    if (wantsAppointment && !values.appointment?.scheduledAt) {
      toast.error("Informe a data e horário da visita.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        appointment: wantsAppointment ? values.appointment : undefined,
      });
      form.reset({ dispositionId: "", notes: "" });
      setWantsAppointment(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="dispositionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parecer</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o resultado da ligação" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groupedDispositions.map(({ category, items }) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{DISPOSITION_CATEGORY_LABELS[category]}</SelectLabel>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isFollowUp && (
          <FormField
            control={form.control}
            name="nextContactAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Próximo contato</FormLabel>
                <p className="text-xs font-normal text-muted-foreground">
                  O lead volta no topo da sua fila nessa data.
                </p>
                <FormControl>
                  <Input
                    type="datetime-local"
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showQualification && (
          <div className="space-y-4 rounded-md border p-4">
            <p className="text-sm font-medium">Qualificação do interesse</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="qualification.stillOwnsLastVehicle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ainda possui o último veículo comprado conosco?</FormLabel>
                    <Select
                      value={field.value === undefined ? undefined : String(field.value)}
                      onValueChange={(v) => field.onChange(v === "true")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification.currentVehicle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo atual</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: T-Cross 2022" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification.interestedInTrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pretende trocar de veículo?</FormLabel>
                    <Select
                      value={field.value === undefined ? undefined : String(field.value)}
                      onValueChange={(v) => field.onChange(v === "true")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification.purchaseTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quando pretende trocar?</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PURCHASE_TIMELINE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification.interestedInEvent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tem interesse em participar do evento?</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EVENT_INTEREST_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="wants-appointment">Deseja agendar uma visita?</Label>
              <Switch id="wants-appointment" checked={wantsAppointment} onCheckedChange={setWantsAppointment} />
            </div>

            {wantsAppointment && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="appointment.scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e horário da visita</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appointment.sellerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor responsável</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sellers.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Anote detalhes relevantes da conversa" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg" disabled={submitting || !selectedDispositionId}>
          {submitting ? "Salvando..." : "Salvar e ir para o próximo"}
        </Button>
      </form>
    </Form>
  );
}
