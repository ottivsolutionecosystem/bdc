"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEMPERATURE_LABELS } from "@/lib/campaign-labels";
import type { ContactTemperature } from "@/generated/prisma/enums";

export function OverrideTemperature({
  campaignId,
  contactId,
  temperature,
}: {
  campaignId: string;
  contactId: string;
  temperature: ContactTemperature;
}) {
  const router = useRouter();

  async function handleChange(next: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}/temperature`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temperature: next }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível alterar a temperatura.");
      return;
    }
    toast.success("Temperatura atualizada.");
    router.refresh();
  }

  return (
    <Select value={temperature} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(TEMPERATURE_LABELS) as [ContactTemperature, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
