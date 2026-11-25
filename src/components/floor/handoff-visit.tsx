"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FloorPerson } from "@/types/floor";

export function HandoffVisit({
  visitId,
  options,
  label,
  emptyLabel,
}: {
  visitId: string;
  options: FloorPerson[];
  label: string;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const target = options.find((person) => person.id === targetId);

  async function handoff() {
    if (!target) return;
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/visits/${visitId}/handoff`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: target.id }),
      });
      toast.success(`Atendimento transferido para ${target.name}.`);
      setTargetId("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" className="h-9 px-2 text-muted-foreground" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex w-full basis-full flex-col gap-2 rounded-xl bg-muted/70 p-3 sm:flex-row sm:items-center">
      {options.length === 0 ? (
        <p className="flex-1 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Select value={targetId || undefined} onValueChange={setTargetId}>
          <SelectTrigger className="w-full bg-white sm:max-w-xs">
            <SelectValue placeholder="Quem vai receber" />
          </SelectTrigger>
          <SelectContent>
            {options.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={submitting || !target} onClick={handoff}>
          {submitting ? "Transferindo..." : "Confirmar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
