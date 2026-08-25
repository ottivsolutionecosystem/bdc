"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { QueueStatCards, type QueueStats } from "@/components/campaigns/operation/queue-stat-cards";
import { NextContactCard } from "@/components/campaigns/operation/next-contact-card";
import { WavoipCallScreen } from "@/components/campaigns/operation/wavoip-call-screen";
import { DispositionForm } from "@/components/campaigns/operation/disposition-form";
import { EmptyQueueState } from "@/components/campaigns/operation/empty-queue-state";
import { AttemptTimeline } from "@/components/campaigns/operation/attempt-timeline";
import { TransferToSalesButton } from "@/components/campaigns/operation/transfer-to-sales-button";
import { NotifySellersGroupButton } from "@/components/campaigns/operation/notify-sellers-group-button";
import { isEligibleForSellersGroupNotify, shouldStayOnQueueContact } from "@/lib/sellers-notify";
import {
  hangupWavoipCall,
  setWavoipMuted,
  setWavoipSpeaker,
  startWavoipCall,
  unlockWavoipMicrophone,
  type WavoipCallStatus,
} from "@/lib/wavoip-client";
import type { SubmitAttemptInput } from "@/schemas/attempt";
import type { DispositionOption, QueueContact, Seller } from "@/types/campaign";

export function OperationPanel({
  campaignId,
  initialStats,
  dispositions,
  sellers,
  sellersNotifyEnabled,
  wavoipDeviceToken,
}: {
  campaignId: string;
  initialStats: QueueStats;
  dispositions: DispositionOption[];
  sellers: Seller[];
  sellersNotifyEnabled: boolean;
  wavoipDeviceToken?: string | null;
}) {
  const [stats, setStats] = useState<QueueStats>(initialStats);
  const [contact, setContact] = useState<QueueContact | null | undefined>(undefined);
  const [callStatus, setCallStatus] = useState<WavoipCallStatus | null>(null);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [startingCall, setStartingCall] = useState(false);

  const fetchStats = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/queue/stats`);
    if (response.ok) {
      const data = await response.json();
      setStats(data.stats);
    }
  }, [campaignId]);

  const fetchNextContact = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/queue/next`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível carregar o próximo contato.");
      setContact(null);
      return;
    }
    const data = await response.json();
    setContact(data.contact);
  }, [campaignId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial da fila ao montar o painel
    fetchNextContact();
  }, [fetchNextContact]);

  useEffect(() => {
    return () => {
      void hangupWavoipCall();
    };
  }, []);

  async function handleSubmitAttempt(input: SubmitAttemptInput) {
    if (!contact) return;
    const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contact.id}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(data?.error ?? "Não foi possível salvar o parecer.");
      return;
    }

    const saved = data?.contact as QueueContact | undefined;
    if (data?.sellersNotify?.status === "sent") {
      toast.success("Parecer registrado e grupo de vendedores avisado.");
    } else if (data?.sellersNotify?.status === "failed") {
      toast.success("Parecer registrado com sucesso.");
      toast.error(data.sellersNotify.error ?? "Não foi possível avisar o grupo de vendedores.");
    } else {
      toast.success("Parecer registrado com sucesso.");
    }
    if (saved && shouldStayOnQueueContact(saved, sellersNotifyEnabled)) {
      setContact(saved);
      await fetchStats();
      return;
    }
    await Promise.all([fetchNextContact(), fetchStats()]);
  }

  async function handleCall(phone: string) {
    if (!contact || !wavoipDeviceToken || startingCall || callStatus) return;
    setStartingCall(true);
    setMuted(false);
    setSpeakerOn(false);
    try {
      await unlockWavoipMicrophone();
      setCallStatus("calling");
      await startWavoipCall({
        token: wavoipDeviceToken,
        phone,
        onActive: () => setCallStatus("active"),
        onEnded: () => {
          setCallStatus(null);
          setMuted(false);
          setSpeakerOn(false);
        },
      });
    } catch (error) {
      setCallStatus(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível ligar pelo Wavoip.");
    } finally {
      setStartingCall(false);
    }
  }

  async function handleHangup() {
    await hangupWavoipCall();
    setCallStatus(null);
    setMuted(false);
    setSpeakerOn(false);
  }

  async function handleMute() {
    const next = !muted;
    try {
      await setWavoipMuted(next);
      setMuted(next);
    } catch {
      toast.error("Não foi possível alterar o mudo.");
    }
  }

  async function handleSpeaker() {
    const next = !speakerOn;
    const applied = await setWavoipSpeaker(next);
    if (!applied && next) {
      toast.message("Neste aparelho o áudio já sai no viva-voz.");
    }
    setSpeakerOn(next);
  }

  return (
    <div className="page-shell !max-w-3xl">
      <QueueStatCards stats={stats} />

      {contact === undefined && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {contact === null && <EmptyQueueState stats={stats} />}

      {contact && (
        <div className="space-y-6">
          <NextContactCard
            contact={contact}
            wavoipDeviceToken={wavoipDeviceToken}
            calling={startingCall || Boolean(callStatus)}
            onCall={handleCall}
          />
          {sellersNotifyEnabled && isEligibleForSellersGroupNotify(contact) && (
            <NotifySellersGroupButton
              campaignId={campaignId}
              contact={contact}
              onNotified={(updated) => setContact(updated)}
            />
          )}
          {(contact.temperature === "HOT" || contact.status === "CONVERTED") && !contact.transferredToSales && (
            <TransferToSalesButton
              campaignId={campaignId}
              contactId={contact.id}
              onTransferred={() => fetchStats()}
            />
          )}
          <DispositionForm
            key={contact.id}
            dispositions={dispositions}
            sellers={sellers}
            onSubmit={handleSubmitAttempt}
          />
          {contact.attemptsCount > 0 && (
            <AttemptTimeline key={contact.id} campaignId={campaignId} contactId={contact.id} />
          )}
        </div>
      )}

      {contact && callStatus && (
        <WavoipCallScreen
          name={contact.name}
          phone={contact.phone}
          status={callStatus}
          muted={muted}
          speakerOn={speakerOn}
          onMute={() => void handleMute()}
          onSpeaker={() => void handleSpeaker()}
          onHangup={() => void handleHangup()}
        />
      )}
    </div>
  );
}
