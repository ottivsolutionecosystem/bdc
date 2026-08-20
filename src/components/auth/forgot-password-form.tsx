"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível solicitar a redefinição.");
        return;
      }
      toast.success(data?.message ?? "Se o e-mail existir, enviaremos o link.");
      setResetUrl(typeof data?.resetUrl === "string" ? data.resetUrl : null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Enviando..." : "Enviar link"}
      </Button>
      {resetUrl && (
        <p className="break-all text-xs text-muted-foreground">
          Ambiente local:{" "}
          <a className="underline" href={resetUrl}>
            {resetUrl}
          </a>
        </p>
      )}
    </form>
  );
}
