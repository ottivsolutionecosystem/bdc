"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { dateTimeFormatter } from "@/lib/datetime";
import type { QueueContact } from "@/types/campaign";

export function NotifySellersGroupButton({
  campaignId,
  contact,
  onNotified,
}: {
  campaignId: string;
  contact: QueueContact;
  onNotified?: (contact: QueueContact) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const alreadySent = Boolean(contact.sellersGroupNotifiedAt);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contact.id}/notify-sellers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível avisar o grupo de vendedores.");
        return;
      }
      toast.success("Grupo de vendedores avisado.");
      setOpen(false);
      setNote("");
      if (data?.contact) onNotified?.(data.contact as QueueContact);
    } finally {
      setSubmitting(false);
    }
  }

  const notifiedLabel = contact.sellersGroupNotifiedAt
    ? dateTimeFormatter.format(new Date(contact.sellersGroupNotifiedAt))
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Megaphone />
          {alreadySent ? "Avisar o grupo de novo" : "Avisar grupo de vendedores"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avisar o grupo de vendedores</DialogTitle>
          <DialogDescription>
            O aviso já sai ao salvar um parecer Positivo ou Conversão. Use este botão só se precisar
            mandar de novo. O WhatsApp da mensagem usa o horário de Cuiabá.
            {notifiedLabel ? ` Último aviso: ${notifiedLabel}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="sellers-group-note">Recado para o grupo (opcional)</Label>
          <Textarea
            id="sellers-group-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: quer o Onix ainda hoje, ligar agora."
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enviando..." : alreadySent ? "Enviar de novo" : "Enviar para o grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
