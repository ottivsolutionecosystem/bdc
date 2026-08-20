"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type EligibleUser = { id: string; name: string; email: string };

export type CampaignAgentRow = {
  id: string;
  active: boolean;
  assignedCount: number;
  user: { id: string; name: string; email: string };
};

export function ManageAgents({
  campaignId,
  agents,
  eligibleUsers,
}: {
  campaignId: string;
  agents: CampaignAgentRow[];
  eligibleUsers: EligibleUser[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const availableUsers = eligibleUsers.filter(
    (candidate) => !agents.some((agent) => agent.user.id === candidate.id && agent.active)
  );

  async function handleAdd() {
    if (!selectedUserId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível adicionar a agente.");
        return;
      }
      toast.success("Agente adicionada à campanha.");
      setSelectedUserId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(agentId: string, active: boolean) {
    const response = await fetch(`/api/campaigns/${campaignId}/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível atualizar a agente.");
      return;
    }
    router.refresh();
  }

  async function handleRemove(agentId: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/agents/${agentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível remover a agente.");
      return;
    }
    const data = await response.json();
    toast.success(`Agente removida. ${data.redistributed} contato(s) redistribuído(s).`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agentes da campanha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="sm:w-72">
              <SelectValue placeholder="Selecione uma agente" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhuma agente disponível
                </div>
              ) : (
                availableUsers.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedUserId || submitting}>
            <UserPlus />
            Adicionar
          </Button>
        </div>

        {agents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma agente adicionada ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>Base atribuída</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ativa</TableHead>
                <TableHead className="text-right">Remover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="font-medium">{agent.user.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.user.email}</div>
                  </TableCell>
                  <TableCell>{agent.assignedCount}</TableCell>
                  <TableCell>
                    <Badge variant={agent.active ? "default" : "secondary"}>
                      {agent.active ? "Participando" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={agent.active}
                      onCheckedChange={(checked) => handleToggleActive(agent.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Remover agente">
                          <UserMinus className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover {agent.user.name} da campanha?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Os {agent.assignedCount} contatos pendentes atualmente atribuídos a ela serão
                            redistribuídos automaticamente entre as demais agentes ativas. O histórico de
                            tentativas é preservado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(agent.id)}>Remover e redistribuir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
