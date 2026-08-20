"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SalesNotesField({ endpoint, value }: { endpoint: string; value: string | null }) {
  const router = useRouter();
  const [notes, setNotes] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = notes !== (value ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível salvar a observação.");
        return;
      }
      toast.success("Observação salva.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={notes}
        placeholder="Anotações da negociação"
        onChange={(event) => setNotes(event.target.value)}
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !dirty}>
        {saving ? "Salvando..." : "Salvar nota"}
      </Button>
    </div>
  );
}
