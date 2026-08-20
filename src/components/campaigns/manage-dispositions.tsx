"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DISPOSITION_CATEGORY_LABELS, TEMPERATURE_LABELS } from "@/lib/campaign-labels";
import { dispositionCategoryValues, contactTemperatureValues } from "@/schemas/disposition";
import type { ContactTemperature, DispositionCategory } from "@/generated/prisma/enums";

export type DispositionRow = {
  id: string;
  campaignId: string | null;
  code: string;
  label: string;
  category: DispositionCategory;
  requiresNextContact: boolean;
  defaultTemperature: ContactTemperature;
  active: boolean;
};

function slugFromLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

export function ManageDispositions({
  campaignId,
  dispositions,
  canEditGlobals = false,
}: {
  campaignId: string;
  dispositions: DispositionRow[];
  canEditGlobals?: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<DispositionCategory>("POSITIVE");
  const [temperature, setTemperature] = useState<ContactTemperature>("WARM");
  const [requiresNext, setRequiresNext] = useState(false);
  const [saveAsGlobal, setSaveAsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const code = useMemo(() => slugFromLabel(label), [label]);

  async function handleCreate() {
    if (!label.trim() || !code) {
      toast.error("Informe o nome do parecer.");
      return;
    }
    setSubmitting(true);
    try {
      const path = saveAsGlobal ? "/api/dispositions" : `/api/campaigns/${campaignId}/dispositions`;
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          label: label.trim(),
          category,
          defaultTemperature: temperature,
          requiresNextContact: requiresNext,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível criar o parecer.");
        return;
      }
      toast.success(saveAsGlobal ? "Parecer padrão criado." : "Parecer adicionado à campanha.");
      setLabel("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(disposition: DispositionRow, active: boolean) {
    const response = await fetch(`/api/campaigns/${campaignId}/dispositions/${disposition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível atualizar o parecer.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pareceres</CardTitle>
        <CardDescription>
          Os pareceres padrão valem para todas as campanhas. Aqui você adiciona opções específicas desta
          operação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="disposition-label">Novo parecer</Label>
            <Input
              id="disposition-label"
              value={label}
              placeholder="Ex: Pediu proposta por WhatsApp"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as DispositionCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dispositionCategoryValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DISPOSITION_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Temperatura</Label>
            <Select
              value={temperature}
              onValueChange={(value) => setTemperature(value as ContactTemperature)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactTemperatureValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TEMPERATURE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={requiresNext} onCheckedChange={setRequiresNext} />
          Exige data de retorno
        </label>
        {canEditGlobals && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={saveAsGlobal} onCheckedChange={setSaveAsGlobal} />
            Salvar como parecer padrão (todas as campanhas)
          </label>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parecer</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispositions.map((disposition) => {
              const isGlobal = disposition.campaignId === null;
              return (
                <TableRow key={disposition.id}>
                  <TableCell>
                    <div className="font-medium">{disposition.label}</div>
                    <div className="text-xs text-muted-foreground">{disposition.code}</div>
                  </TableCell>
                  <TableCell>{DISPOSITION_CATEGORY_LABELS[disposition.category]}</TableCell>
                  <TableCell>
                    <Badge variant={isGlobal ? "secondary" : "default"}>
                      {isGlobal ? "Padrão" : "Desta campanha"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isGlobal && !canEditGlobals ? (
                      <span className="text-xs text-muted-foreground">
                        {disposition.active ? "Ativo" : "Inativo"}
                      </span>
                    ) : (
                      <Switch
                        checked={disposition.active}
                        onCheckedChange={(checked) => handleToggle(disposition, checked)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
