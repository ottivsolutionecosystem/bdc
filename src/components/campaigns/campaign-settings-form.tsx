"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_TYPE_LABELS, campaignTypeLabel } from "@/lib/campaign-labels";
import { isCampaignType } from "@/schemas/campaign";
import type { CampaignStatus } from "@/generated/prisma/enums";

const STATUS_HINT: Record<CampaignStatus, string> = {
  DRAFT: "Monte agentes e importe a base. Ligações só começam depois de ativar.",
  ACTIVE: "Agentes podem operar a fila de ligações.",
  PAUSED: "A fila fica bloqueada até reativar.",
  COMPLETED: "Campanha encerrada. Sem novas ligações ou alterações.",
  CANCELED: "Campanha cancelada. Sem novas ligações ou alterações.",
};

function toDateInput(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function fromDateInput(value: string) {
  return value ? `${value}T00:00:00.000Z` : null;
}

export function CampaignSettingsForm({
  campaignId,
  name,
  description,
  status,
  type,
  startDate,
  endDate,
  agentCount,
  sellersNotifyWebhookUrl,
}: {
  campaignId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  type: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  agentCount: number;
  sellersNotifyWebhookUrl: string | null;
}) {
  const router = useRouter();
  const [nextName, setNextName] = useState(name);
  const [nextDescription, setNextDescription] = useState(description ?? "");
  const [nextStatus, setNextStatus] = useState<CampaignStatus>(status);
  const knownType = isCampaignType(type);
  const [nextType, setNextType] = useState(knownType ? type : "other");
  const [nextStart, setNextStart] = useState(toDateInput(startDate));
  const [nextEnd, setNextEnd] = useState(toDateInput(endDate));
  const [nextWebhookUrl, setNextWebhookUrl] = useState(sellersNotifyWebhookUrl ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (nextStatus === "ACTIVE" && agentCount === 0) {
      toast.error("Vincule pelo menos uma agente antes de ativar a campanha.");
      return;
    }
    if (nextName.trim().length < 3) {
      toast.error("Informe um nome com pelo menos 3 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName.trim(),
          description: nextDescription.trim() || null,
          status: nextStatus,
          type: nextType,
          startDate: fromDateInput(nextStart),
          endDate: fromDateInput(nextEnd),
          sellersNotifyWebhookUrl: nextWebhookUrl.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível atualizar a campanha.");
        return;
      }
      toast.success("Campanha atualizada.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da campanha</CardTitle>
        <CardDescription>
          A campanha nasce em rascunho. Ative somente quando a base e as agentes estiverem prontas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Nome</Label>
          <Input id="campaign-name" value={nextName} onChange={(event) => setNextName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-description">Descrição</Label>
          <Textarea
            id="campaign-description"
            rows={3}
            value={nextDescription}
            onChange={(event) => setNextDescription(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as CampaignStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CAMPAIGN_STATUS_LABELS) as [CampaignStatus, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STATUS_HINT[nextStatus]}</p>
            {nextStatus === "ACTIVE" && agentCount === 0 && (
              <p className="text-xs text-destructive">Não há agentes ativas nesta campanha.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={nextType} onValueChange={(value) => setNextType(value as typeof nextType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!knownType && (
                  <SelectItem value={type} disabled>
                    {campaignTypeLabel(type)}
                  </SelectItem>
                )}
                {Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-start">Início</Label>
            <Input
              id="campaign-start"
              type="date"
              value={nextStart}
              onChange={(event) => setNextStart(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-end">Fim</Label>
            <Input
              id="campaign-end"
              type="date"
              value={nextEnd}
              onChange={(event) => setNextEnd(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-webhook">Webhook do grupo de vendedores (n8n)</Label>
          <Input
            id="campaign-webhook"
            type="url"
            inputMode="url"
            placeholder="https://n8n.seudominio.com/webhook/..."
            value={nextWebhookUrl}
            onChange={(event) => setNextWebhookUrl(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Quando a agente agendar visita ou registrar interesse, ela pode avisar o grupo. O n8n recebe os
            dados do cliente no campo <span className="font-medium">text</span> para mandar no WhatsApp.
          </p>
        </div>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardContent>
    </Card>
  );
}
