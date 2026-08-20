"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MonitorPlay, Trophy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clockFormatter } from "@/lib/datetime";
import { RANKING_SCORE_WEIGHTS, type RankingBoardAgent, type RankingBoardPayload } from "@/lib/ranking";

const POLL_MS = 15_000;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function PodiumCard({
  agent,
  place,
  highlight,
}: {
  agent: RankingBoardAgent;
  place: 1 | 2 | 3;
  highlight: boolean;
}) {
  const height = place === 1 ? "min-h-56 sm:min-h-64" : place === 2 ? "min-h-48 sm:min-h-56" : "min-h-44 sm:min-h-52";
  const medal = place === 1 ? "1º" : place === 2 ? "2º" : "3º";
  const ring = place === 1 ? "ring-2 ring-primary" : "ring-1 ring-white/15";

  return (
    <div
      className={cn(
        "flex flex-col justify-end rounded-2xl bg-white/8 px-4 py-5 text-center text-white",
        height,
        ring,
        highlight && "bg-primary/20"
      )}
    >
      <p className={cn("font-semibold tracking-tight", place === 1 ? "text-5xl text-primary" : "text-3xl text-white/80")}>
        {medal}
      </p>
      <div
        className={cn(
          "mx-auto mt-3 flex items-center justify-center rounded-full font-semibold",
          place === 1 ? "size-16 bg-primary text-xl text-white" : "size-12 bg-white/15 text-base"
        )}
      >
        {initials(agent.agentName)}
      </div>
      <p className={cn("mt-3 font-semibold", place === 1 ? "text-xl" : "text-base")}>{agent.agentName}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{agent.score}</p>
      <p className="text-xs text-white/60">pontos na campanha</p>
      <p className="mt-3 text-sm text-white/75">
        Hoje: {agent.attemptsToday} lig. · {agent.scoreToday} pts
      </p>
    </div>
  );
}

export function RankingBoard({
  campaignId,
  initial,
  viewerUserId,
  tv,
}: {
  campaignId: string;
  initial: RankingBoardPayload;
  viewerUserId: string;
  tv: boolean;
}) {
  const [data, setData] = useState(initial);
  const [clock, setClock] = useState(() => clockFormatter.format(new Date()));
  const [liveError, setLiveError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ranking`);
      if (response.status === 401) {
        setSessionExpired(true);
        setLiveError("Sessão expirada. Entre de novo para o painel continuar ao vivo.");
        return;
      }
      if (!response.ok) {
        setLiveError("Não foi possível atualizar o ranking. Nova tentativa em 15s.");
        return;
      }
      setData(await response.json());
      setLiveError(null);
      setSessionExpired(false);
    } catch {
      setLiveError("Sem conexão. O painel tenta de novo em 15s.");
    }
  }, [campaignId]);

  useEffect(() => {
    const tick = window.setInterval(() => setClock(clockFormatter.format(new Date())), 1000);
    if (sessionExpired) {
      return () => window.clearInterval(tick);
    }
    const poll = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [refresh, sessionExpired]);

  const leaderScore = data.agents[0]?.score ?? 0;
  const first = data.agents.find((agent) => agent.rank === 1);
  const second = data.agents.find((agent) => agent.rank === 2);
  const third = data.agents.find((agent) => agent.rank === 3);
  const rest = data.agents.filter((agent) => agent.rank > 3);

  const board = (
    <div className={cn("flex min-h-full flex-col gap-6", tv ? "p-6 sm:p-8" : "")}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Ranking ao vivo</p>
          <h2 className={cn("font-semibold tracking-tight text-white", tv ? "text-4xl" : "text-2xl")}>
            {data.campaign.name}
          </h2>
          <p className="mt-1 text-sm text-white/65">
            Horário de Cuiabá · atualiza a cada 15s · {clock}
          </p>
        </div>
        {tv ? (
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link href={`/campaigns/${campaignId}/ranking`}>
              <X />
              Sair do espelhamento
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/campaigns/${campaignId}/ranking?tv=1`}>
              <MonitorPlay />
              Espelhar na TV
            </Link>
          </Button>
        )}
      </header>

      {liveError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
          <p>{liveError}</p>
          {sessionExpired ? (
            <Button asChild size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link href="/login">Entrar de novo</Link>
            </Button>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Ligações hoje", value: data.totals.attemptsToday },
          { label: "Contatos hoje", value: data.totals.successfulContactsToday },
          { label: "Interessados hoje", value: data.totals.interestedToday },
          { label: "Visitas hoje", value: data.totals.appointmentsToday },
          { label: "Pontos hoje", value: data.totals.scoreToday },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white/8 px-4 py-3">
            <p className="text-xs text-white/55">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{item.value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {data.agents.length === 0 ? (
        <p className="py-16 text-center text-white/70">Vincule agentes na campanha para o ranking aparecer.</p>
      ) : (
        <>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <div className="order-2 sm:order-1">
              {second ? <PodiumCard agent={second} place={2} highlight={second.agentId === viewerUserId} /> : <div />}
            </div>
            <div className="order-1 sm:order-2">
              {first ? <PodiumCard agent={first} place={1} highlight={first.agentId === viewerUserId} /> : <div />}
            </div>
            <div className="order-3 sm:order-3">
              {third ? <PodiumCard agent={third} place={3} highlight={third.agentId === viewerUserId} /> : <div />}
            </div>
          </div>

          <div className="space-y-2">
            {rest.map((agent) => {
              const width = leaderScore > 0 ? Math.max(8, Math.round((agent.score / leaderScore) * 100)) : 8;
              const mine = agent.agentId === viewerUserId;
              return (
                <div
                  key={agent.agentId}
                  className={cn("rounded-xl bg-white/8 px-4 py-3", mine && "ring-1 ring-primary")}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-white">
                    <p className="font-medium">
                      <span className="mr-3 tabular-nums text-white/55">{agent.rank}º</span>
                      {agent.agentName}
                      {mine ? <span className="ml-2 text-xs text-primary">você</span> : null}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{agent.score} pts</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    Hoje {agent.attemptsToday} lig. · {agent.successfulContactsToday} contato(s) ·{" "}
                    {agent.interestedToday} interesse · {agent.transferredToday} vendas · {agent.appointmentsToday}{" "}
                    visita(s) · {agent.scoreToday} pts hoje
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-auto flex items-center gap-2 text-xs text-white/45">
        <Trophy className="size-3.5" />
        Pontos: tratado {RANKING_SCORE_WEIGHTS.treated} · contato {RANKING_SCORE_WEIGHTS.successfulContacts} ·
        interesse {RANKING_SCORE_WEIGHTS.interested} · vendas {RANKING_SCORE_WEIGHTS.transferred} · visita{" "}
        {RANKING_SCORE_WEIGHTS.appointments}
      </p>
    </div>
  );

  if (tv) {
    return <div className="fixed inset-0 z-[60] overflow-auto bg-brand-navy">{board}</div>;
  }

  return <div className="overflow-hidden rounded-2xl bg-brand-navy p-5 sm:p-6">{board}</div>;
}
