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

export function SalesStatusSelect({
  endpoint,
  value,
  options,
}: {
  endpoint: string;
  value: string;
  options: Record<string, string>;
}) {
  const router = useRouter();

  async function handleChange(status: string) {
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível atualizar o status.");
      return;
    }
    toast.success("Status atualizado.");
    router.refresh();
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([status, label]) => (
          <SelectItem key={status} value={status}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
