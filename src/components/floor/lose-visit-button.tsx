"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoseVisitButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLose() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visitId}/lose`, {
        method: "POST",
        body: JSON.stringify({ lostReason: reason }),
      });
      toast.success("Atendimento encerrado.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Não fechou
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motivo"
      />
      <Button type="button" variant="destructive" disabled={submitting} onClick={handleLose}>
        Encerrar
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Voltar
      </Button>
    </div>
  );
}
