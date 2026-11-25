"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAIR_EVENT_STATUS_LABELS } from "@/lib/floor-labels";
import type { FloorEventDto } from "@/types/floor";

export function FloorEventList({
  events,
  campaigns,
  canManage,
}: {
  events: FloorEventDto[];
  campaigns: { id: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      {canManage ? <CreateEventDialog campaigns={campaigns} /> : null}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum feirão aberto. Um administrador precisa criar e abrir o evento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  {event.name}
                  <Badge variant="secondary">{FAIR_EVENT_STATUS_LABELS[event.status]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {[event.location, event.campaignName].filter(Boolean).join(" · ") || "Sem local definido"}
                </p>
                <p className="text-sm">
                  {event.visitCount} atendimentos · {event.peopleCount} pessoas
                </p>
                <Button asChild>
                  <Link href={`/floor/${event.id}`}>Abrir operação</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateEventDialog({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [campaignId, setCampaignId] = useState("none");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const data = await floorRequest("/api/floor/events", {
        method: "POST",
        body: JSON.stringify({
          name,
          location,
          campaignId: campaignId === "none" ? "" : campaignId,
          status: "ACTIVE",
        }),
      });
      toast.success("Feirão aberto.");
      setOpen(false);
      router.push(`/floor/${data.event.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo feirão</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir um feirão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fair-name">Nome</Label>
            <Input id="fair-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fair-location">Local</Label>
            <Input id="fair-location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Campanha de ligação</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" disabled={submitting || name.trim().length < 2} onClick={handleCreate}>
            Abrir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
