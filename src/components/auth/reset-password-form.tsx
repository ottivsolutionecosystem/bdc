"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível redefinir a senha.");
        return;
      }
      toast.success("Senha redefinida. Entre com a nova senha.");
      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-muted-foreground">Link inválido. Solicite uma nova redefinição.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-password">Nova senha</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
