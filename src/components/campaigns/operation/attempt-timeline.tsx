"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AttemptHistoryItem = {
  id: string;
  attemptNumber: number;
  contacted: boolean;
  notes: string | null;
  createdAt: string;
  agent: { name: string };
  disposition: { label: string };
};

export function AttemptTimeline({ campaignId, contactId }: { campaignId: string; contactId: string }) {
  const [attempts, setAttempts] = useState<AttemptHistoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/campaigns/${campaignId}/contacts/${contactId}/attempts`)
      .then((res) => (res.ok ? res.json() : { attempts: [] }))
      .then((data) => {
        if (!cancelled) setAttempts(data.attempts);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, contactId]);

  if (!attempts || attempts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="size-4" />
          Histórico de tentativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="border-l-2 pl-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                  new Date(attempt.createdAt)
                )}
              </span>
              <Badge variant="secondary">Tentativa #{attempt.attemptNumber}</Badge>
              <span className="text-muted-foreground">{attempt.agent.name}</span>
            </div>
            <p className="mt-0.5">
              Parecer: <span className="font-medium">{attempt.disposition.label}</span>
            </p>
            {attempt.notes && <p className="text-muted-foreground">{attempt.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
