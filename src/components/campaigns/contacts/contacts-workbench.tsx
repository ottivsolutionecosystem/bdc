"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactStatusBadge } from "@/components/campaigns/status-badge";
import { MoveContactAction } from "@/components/campaigns/contacts/move-contact-action";
import { ContactNameButton } from "@/components/campaigns/contacts/contact-name-button";
import { OverrideTemperature } from "@/components/campaigns/contacts/override-temperature";
import { EVENT_INTEREST_LABELS } from "@/lib/campaign-labels";
import { actionReasonLabel, REOPENABLE_STATUSES, type ContactListGroup } from "@/lib/contact-action";
import type { ContactStatus, ContactTemperature, EventInterest } from "@/generated/prisma/enums";

export type ContactRow = {
  id: string;
  name: string;
  phone: string;
  lastVehicle: string | null;
  status: ContactStatus;
  temperature: ContactTemperature;
  attemptsCount: number;
  lastAttemptAt: Date | null;
  nextContactAt: Date | null;
  notes: string | null;
  interestedInEvent: EventInterest | null;
  assignedAgent: { id: string; name: string } | null;
  finalDisposition: { id: string; label: string } | null;
  appointment: { id: string; scheduledAt: Date; seller: { name: string } | null } | null;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const ROTATE_VALUE = "__rotate__";

function formatDate(date: Date | null) {
  return date ? dateFormatter.format(new Date(date)) : "—";
}

function toDatetimeLocal(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function isReopenable(status: ContactStatus) {
  return REOPENABLE_STATUSES.includes(status);
}

export function ContactsWorkbench({
  campaignId,
  group,
  contacts,
  eligibleAgents,
}: {
  campaignId: string;
  group: ContactListGroup;
  contacts: ContactRow[];
  eligibleAgents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [requeueOpen, setRequeueOpen] = useState(false);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [toUserId, setToUserId] = useState(ROTATE_VALUE);
  const [nextContactLocal, setNextContactLocal] = useState(toDatetimeLocal);
  const [note, setNote] = useState("");

  const selectableIds = useMemo(
    () => contacts.filter((contact) => isReopenable(contact.status)).map((contact) => contact.id),
    [contacts]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  function toggleAll(checked: boolean) {
    setSelected(checked ? selectableIds : []);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  function openReopen(ids: string[]) {
    setTargetIds(ids);
    setNextContactLocal(toDatetimeLocal());
    setNote("");
    setReopenOpen(true);
  }

  function openRequeue(ids: string[]) {
    setTargetIds(ids);
    setNextContactLocal(toDatetimeLocal());
    setNote("");
    setToUserId(ROTATE_VALUE);
    setRequeueOpen(true);
  }

  async function reopen() {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: targetIds,
          nextContactAt: fromDatetimeLocal(nextContactLocal),
          note: note.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível devolver à fila.");
        return;
      }
      toast.success(`${data.reopened} lead(s) voltaram para a fila da mesma agente.`);
      setSelected([]);
      setReopenOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function requeue() {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/requeue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: targetIds,
          toUserId: toUserId === ROTATE_VALUE ? undefined : toUserId,
          nextContactAt: fromDatetimeLocal(nextContactLocal),
          note: note.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível redistribuir.");
        return;
      }
      toast.success(`${data.requeued} lead(s) foram para a fila de outra agente.`);
      setSelected([]);
      setRequeueOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (contacts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {group === "action"
          ? "Nenhum lead precisa de ação agora. Retornos futuros e casos encerrados não aparecem aqui."
          : "Nenhum contato encontrado com esses filtros."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selected.length > 0
            ? `${selected.length} lead(s) selecionado(s)`
            : "Selecione leads indefinidos para devolver à mesma fila ou redistribuir."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selected.length === 0 || loading}
            onClick={() => openReopen(selected)}
          >
            Mesma fila
          </Button>
          <Button size="sm" disabled={selected.length === 0 || loading} onClick={() => openRequeue(selected)}>
            Redistribuir
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(value) => toggleAll(value === true)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              {group !== "treated" && <TableHead>Veículo</TableHead>}
              <TableHead>Agente</TableHead>
              {group === "action" && <TableHead>Motivo</TableHead>}
              {group === "treated" && <TableHead>Parecer</TableHead>}
              {group === "treated" && <TableHead>Temperatura</TableHead>}
              <TableHead className="text-right">Tentativas</TableHead>
              {group !== "treated" && <TableHead>Próximo contato</TableHead>}
              {group === "treated" && <TableHead>Observação</TableHead>}
              {group === "treated" && <TableHead>Data do tratamento</TableHead>}
              <TableHead>Status</TableHead>
              {group === "treated" && <TableHead>Interessado</TableHead>}
              {group === "treated" && <TableHead>Agendado</TableHead>}
              {group === "treated" && <TableHead>Vendedor</TableHead>}
              <TableHead className="text-right">Fila</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const canAct = isReopenable(contact.status);
              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(contact.id)}
                      disabled={!canAct}
                      onCheckedChange={(value) => toggleOne(contact.id, value === true)}
                      aria-label={`Selecionar ${contact.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <ContactNameButton campaignId={campaignId} contactId={contact.id} name={contact.name} />
                  </TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  {group !== "treated" && <TableCell>{contact.lastVehicle ?? "—"}</TableCell>}
                  <TableCell>{contact.assignedAgent?.name ?? "—"}</TableCell>
                  {group === "action" && <TableCell>{actionReasonLabel(contact.status)}</TableCell>}
                  {group === "treated" && <TableCell>{contact.finalDisposition?.label ?? "—"}</TableCell>}
                  {group === "treated" && (
                    <TableCell>
                      <OverrideTemperature
                        campaignId={campaignId}
                        contactId={contact.id}
                        temperature={contact.temperature}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums">{contact.attemptsCount}</TableCell>
                  {group !== "treated" && <TableCell>{formatDate(contact.nextContactAt)}</TableCell>}
                  {group === "treated" && (
                    <TableCell className="max-w-48 truncate" title={contact.notes ?? undefined}>
                      {contact.notes ?? "—"}
                    </TableCell>
                  )}
                  {group === "treated" && <TableCell>{formatDate(contact.lastAttemptAt)}</TableCell>}
                  <TableCell>
                    <ContactStatusBadge status={contact.status} />
                  </TableCell>
                  {group === "treated" && (
                    <TableCell>
                      {contact.interestedInEvent ? EVENT_INTEREST_LABELS[contact.interestedInEvent] : "—"}
                    </TableCell>
                  )}
                  {group === "treated" && (
                    <TableCell>{contact.appointment ? formatDate(contact.appointment.scheduledAt) : "—"}</TableCell>
                  )}
                  {group === "treated" && <TableCell>{contact.appointment?.seller?.name ?? "—"}</TableCell>}
                  <TableCell className="text-right">
                    {canAct ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          onClick={() => openReopen([contact.id])}
                        >
                          Mesma fila
                        </Button>
                        {eligibleAgents.length > 0 && (
                          <MoveContactAction
                            campaignId={campaignId}
                            contactId={contact.id}
                            currentAgentId={contact.assignedAgent?.id ?? null}
                            agents={eligibleAgents}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Encerrado</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver à mesma fila</DialogTitle>
            <DialogDescription>
              {targetIds.length} lead(s) voltam para a agente atual. A operação puxa na data informada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reopen-when">Quando entrar em contato</Label>
              <Input
                id="reopen-when"
                type="datetime-local"
                value={nextContactLocal}
                onChange={(event) => setNextContactLocal(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reopen-note">Recado para a agente (opcional)</Label>
              <Textarea
                id="reopen-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: cliente pediu retorno à tarde"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReopenOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={loading || !nextContactLocal} onClick={reopen}>
              {loading ? "Devolvendo..." : "Devolver à fila"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requeueOpen} onOpenChange={setRequeueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redistribuir para outra fila</DialogTitle>
            <DialogDescription>
              {targetIds.length} lead(s) voltam para a operação. O rodízio evita quem já estava com o
              contato, se houver outra agente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Agente</Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROTATE_VALUE}>Rodízio entre agentes</SelectItem>
                  {eligibleAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requeue-when">Quando entrar em contato</Label>
              <Input
                id="requeue-when"
                type="datetime-local"
                value={nextContactLocal}
                onChange={(event) => setNextContactLocal(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requeue-note">Recado para a agente (opcional)</Label>
              <Textarea
                id="requeue-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: já tentamos 3 vezes, ligar em outro horário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequeueOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={loading || !nextContactLocal} onClick={requeue}>
              {loading ? "Redistribuindo..." : "Redistribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
