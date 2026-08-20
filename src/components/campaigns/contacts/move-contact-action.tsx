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

export function MoveContactAction({
  campaignId,
  contactId,
  currentAgentId,
  agents,
}: {
  campaignId: string;
  contactId: string;
  currentAgentId: string | null;
  agents: { id: string; name: string }[];
}) {
  const router = useRouter();

  async function handleChange(toUserId: string) {
    if (toUserId === currentAgentId) return;
    const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível mover o contato.");
      return;
    }
    toast.success("Contato movido.");
    router.refresh();
  }

  return (
    <Select value={currentAgentId ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36" size="sm">
        <SelectValue placeholder="Mover para" />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
