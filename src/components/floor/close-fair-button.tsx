"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { Button } from "@/components/ui/button";

export function CloseFairButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClose() {
    if (!window.confirm("Encerrar este feirão? A recepção deixa de aceitar chegadas.")) return;
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      });
      toast.success("Feirão encerrado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={submitting} onClick={handleClose}>
      Encerrar feirão
    </Button>
  );
}
