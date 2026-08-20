"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function CreateAppointmentDialog({
  customers,
}: {
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!customerId || !when) {
      toast.error("Selecione o cliente e a data da visita.");
      return;
    }
    setSubmitting(true);
    try {
      const scheduledAt = new Date(when).toISOString();
      const response = await fetch("/api/sales/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, scheduledAt, notes }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível criar a visita.");
        return;
      }
      toast.success("Visita agendada.");
      setOpen(false);
      setCustomerId("");
      setWhen("");
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nova visita</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar visita</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit-when">Quando</Label>
            <Input id="visit-when" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit-notes">Observação</Label>
            <Textarea id="visit-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={submitting || customers.length === 0}>
            {submitting ? "Salvando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SalesAgendaCalendar({
  appointments,
}: {
  appointments: { id: string; scheduledAt: Date | string; customer: { name: string } }[];
}) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const daysWithVisits = useMemo(
    () => appointments.map((item) => new Date(item.scheduledAt)),
    [appointments]
  );

  const ofDay = useMemo(() => {
    if (!selected) return [];
    const key = selected.toDateString();
    return appointments.filter((item) => new Date(item.scheduledAt).toDateString() === key);
  }, [appointments, selected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ booked: daysWithVisits }}
        />
        <div className="space-y-2 text-sm">
          <p className="font-medium">{selected ? dateFormatter.format(selected) : "Selecione um dia"}</p>
          {ofDay.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma visita neste dia.</p>
          ) : (
            <ul className="space-y-1">
              {ofDay.map((item) => (
                <li key={item.id}>
                  {dateFormatter.format(new Date(item.scheduledAt))} · {item.customer.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
