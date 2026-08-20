"use client";

import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Seller } from "@/types/campaign";

export function TransferToSalesButton({
  campaignId,
  contactId,
  onTransferred,
}: {
  campaignId: string;
  contactId: string;
  onTransferred?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/sellers")
      .then((res) => res.json())
      .then((data) => setSellers(data.sellers ?? []));
  }, [open]);

  async function handleSubmit() {
    if (!sellerId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, notes: notes || undefined }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível transferir para vendas.");
        return;
      }
      toast.success("Cliente transferido para o vendedor.");
      setOpen(false);
      setSellerId("");
      setNotes("");
      onTransferred?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-temperature-hot text-temperature-hot hover:bg-temperature-hot/10">
          <Handshake />
          Transferir para vendas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir para vendas</DialogTitle>
          <DialogDescription>Escolha o vendedor responsável por dar continuidade a este atendimento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!sellerId || submitting}>
            {submitting ? "Transferindo..." : "Confirmar transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
