"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { ASSIGNMENT_REASON_LABELS } from "@/lib/campaign-labels";
import type { AssignmentChangeReason } from "@/generated/prisma/enums";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

type Ficha = {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  customer: { email: string | null; document: string | null } | null;
  assignmentHistory: {
    id: string;
    reason: AssignmentChangeReason;
    createdAt: string;
    fromAgent: { name: string } | null;
    toAgent: { name: string } | null;
    changedBy: { name: string };
  }[];
  transfers: {
    id: string;
    createdAt: string;
    notes: string | null;
    seller: { name: string };
    agent: { name: string };
  }[];
  attempts: {
    id: string;
    attemptNumber: number;
    createdAt: string;
    notes: string | null;
    disposition: { label: string };
    agent: { name: string };
  }[];
};

export function ContactFichaDialog({
  campaignId,
  contactId,
  contactName,
  open,
  onOpenChange,
}: {
  campaignId: string;
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [name, setName] = useState(contactName);
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/contacts/${contactId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: { contact: Ficha }) => {
        if (cancelled) return;
        setFicha(data.contact);
        setName(data.contact.name);
        setEmail(data.contact.customer?.email ?? "");
        setDocument(data.contact.customer?.document ?? "");
        setNotes(data.contact.notes ?? "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar a ficha.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, contactId]);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          document: document || null,
          notes,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível salvar a ficha.");
        return;
      }
      toast.success("Ficha atualizada.");
      router.refresh();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ficha do cliente</DialogTitle>
          <DialogDescription>{ficha?.phone ?? "Dados do contato na campanha."}</DialogDescription>
        </DialogHeader>
        {loading || !ficha ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ficha-name">Nome</Label>
              <Input id="ficha-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ficha-email">E-mail</Label>
                <Input
                  id="ficha-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ficha-document">Documento</Label>
                <Input
                  id="ficha-document"
                  value={document}
                  onChange={(event) => setDocument(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ficha-notes">Observações</Label>
              <Textarea id="ficha-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            {ficha.attempts.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Tentativas</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ficha.attempts.map((attempt) => (
                    <li key={attempt.id}>
                      #{attempt.attemptNumber} · {attempt.disposition.label} · {attempt.agent.name} ·{" "}
                      {dateFormatter.format(new Date(attempt.createdAt))}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {ficha.assignmentHistory.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Atribuições</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ficha.assignmentHistory.map((item) => (
                    <li key={item.id}>
                      {ASSIGNMENT_REASON_LABELS[item.reason]}: {item.fromAgent?.name ?? "sem agente"} →{" "}
                      {item.toAgent?.name ?? "sem agente"} · {item.changedBy.name}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {ficha.transfers.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Transferências</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ficha.transfers.map((item) => (
                    <li key={item.id}>
                      {item.agent.name} → {item.seller.name} · {dateFormatter.format(new Date(item.createdAt))}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || loading || !ficha}>
            {saving ? "Salvando..." : "Salvar ficha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
