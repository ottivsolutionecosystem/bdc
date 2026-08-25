"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { QueueStatCards, type QueueStats } from "@/components/campaigns/operation/queue-stat-cards";
import { NextContactCard } from "@/components/campaigns/operation/next-contact-card";
import { IncomingCallBanner } from "@/components/campaigns/operation/incoming-call-banner";
import { WavoipCallScreen } from "@/components/campaigns/operation/wavoip-call-screen";
import { DispositionForm } from "@/components/campaigns/operation/disposition-form";
import { EmptyQueueState } from "@/components/campaigns/operation/empty-queue-state";
import { AttemptTimeline } from "@/components/campaigns/operation/attempt-timeline";
import { TransferToSalesButton } from "@/components/campaigns/operation/transfer-to-sales-button";
import { NotifySellersGroupButton } from "@/components/campaigns/operation/notify-sellers-group-button";
import { isEligibleForSellersGroupNotify, shouldStayOnQueueContact } from "@/lib/sellers-notify";
import {
  acceptWavoipOffer,
  hangupWavoipCall,
  isWavoipBusy,
  listenWavoipIncoming,
  rejectWavoipOffer,
  releaseWavoipIncoming,
  setWavoipMuted,
  setWavoipSpeaker,
  startWavoipCall,
  stopListeningWavoipIncoming,
  unlockWavoipMicrophone,
  watchWavoipOffer,
  type WavoipCallStatus,
  type WavoipOffer,
} from "@/lib/wavoip-client";
import { startCallRingback, stopCallRingback } from "@/lib/call-ringback";
import type { SubmitAttemptInput } from "@/schemas/attempt";
import type { DispositionOption, QueueContact, Seller } from "@/types/campaign";

type CallParty = { name: string; phone: string };

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
  const [callParty, setCallParty] = useState<CallParty | null>(null);
  const [incoming, setIncoming] = useState<CallParty | null>(null);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [answering, setAnswering] = useState(false);
  const incomingOfferRef = useRef<WavoipOffer | null>(null);
  const unwatchIncomingRef = useRef<(() => void) | null>(null);
  const handleIncomingOfferRef = useRef<(offer: WavoipOffer) => void>(() => {
    releaseWavoipIncoming();
  });
  const incomingSeqRef = useRef(0);

  const busy = startingCall || Boolean(callStatus) || Boolean(incoming);

  const clearIncoming = useCallback((releaseHold: boolean) => {
    incomingSeqRef.current += 1;
    unwatchIncomingRef.current?.();
    unwatchIncomingRef.current = null;
    incomingOfferRef.current = null;
    setIncoming(null);
    setAnswering(false);
    stopCallRingback();
    if (releaseHold) releaseWavoipIncoming();
  }, []);

  const handleCallEnded = useCallback(() => {
    stopCallRingback();
    setCallStatus(null);
    setCallParty(null);
    setMuted(false);
    setSpeakerOn(false);
  }, []);

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

  const handleIncomingOffer = useCallback(
    async (offer: WavoipOffer) => {
      const seq = incomingSeqRef.current;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearIncoming(true);
      };

      unwatchIncomingRef.current = watchWavoipOffer(offer, finish);
      incomingOfferRef.current = offer;

      try {
        const phone = offer.peer.phone ?? "";
        const response = await fetch(
          `/api/campaigns/${campaignId}/incoming?phone=${encodeURIComponent(phone)}`,
        );
        const data = await response.json().catch(() => null);
        if (settled || seq !== incomingSeqRef.current) return;
        if (!response.ok || !data?.contact) {
          finish();
          return;
        }
        setIncoming({ name: data.contact.name, phone: data.contact.phone });
        void startCallRingback();
      } catch {
        finish();
      }
    },
    [campaignId, clearIncoming],
  );

  useEffect(() => {
    handleIncomingOfferRef.current = handleIncomingOffer;
  }, [handleIncomingOffer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial da fila ao montar o painel
    fetchNextContact();
  }, [fetchNextContact]);

  useEffect(() => {
    return () => {
      stopCallRingback();
      void hangupWavoipCall();
    };
  }, []);

  useEffect(() => {
    if (!wavoipDeviceToken) return;
    void listenWavoipIncoming(wavoipDeviceToken, (offer) => {
      void handleIncomingOfferRef.current(offer);
    });
    return () => {
      stopListeningWavoipIncoming();
      clearIncoming(true);
    };
  }, [wavoipDeviceToken, clearIncoming]);

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
    if (!contact || !wavoipDeviceToken || busy || isWavoipBusy()) return;
    setStartingCall(true);
    setMuted(false);
    setSpeakerOn(false);
    setCallParty({ name: contact.name, phone: contact.phone });
    try {
      await unlockWavoipMicrophone();
      await startCallRingback();
      setCallStatus("calling");
      await startWavoipCall({
        token: wavoipDeviceToken,
        phone,
        onActive: () => {
          stopCallRingback();
          setCallStatus("active");
        },
        onEnded: handleCallEnded,
      });
    } catch (error) {
      stopCallRingback();
      setCallStatus(null);
      setCallParty(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível ligar pelo Wavoip.");
    } finally {
      setStartingCall(false);
    }
  }

  async function handleAcceptIncoming() {
    const offer = incomingOfferRef.current;
    const party = incoming;
    if (!offer || !party || answering) return;
    setAnswering(true);
    try {
      stopCallRingback();
      unwatchIncomingRef.current?.();
      unwatchIncomingRef.current = null;
      await acceptWavoipOffer(offer, handleCallEnded);
      clearIncoming(false);
      setMuted(false);
      setSpeakerOn(false);
      setCallParty(party);
      setCallStatus("active");
    } catch (error) {
      setAnswering(false);
      unwatchIncomingRef.current = watchWavoipOffer(offer, () => clearIncoming(true));
      toast.error(error instanceof Error ? error.message : "Não foi possível atender.");
    }
  }

  async function handleRejectIncoming() {
    const offer = incomingOfferRef.current;
    if (answering) return;
    try {
      if (offer) await rejectWavoipOffer(offer);
    } catch {
      toast.error("Não foi possível recusar a ligação.");
    } finally {
      clearIncoming(true);
    }
  }

  async function handleHangup() {
    stopCallRingback();
    await hangupWavoipCall();
    handleCallEnded();
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
            calling={busy}
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

      {incoming && (
        <IncomingCallBanner
          name={incoming.name}
          phone={incoming.phone}
          answering={answering}
          onAccept={() => void handleAcceptIncoming()}
          onReject={() => void handleRejectIncoming()}
        />
      )}

      {callParty && callStatus && (
        <WavoipCallScreen
          name={callParty.name}
          phone={callParty.phone}
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
