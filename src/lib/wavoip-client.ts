"use client";

import type { CallActive, CallOutgoing, Offer, Unsubscribe, Wavoip } from "@wavoip/wavoip-api";

export type { Offer as WavoipOffer };

export type WavoipCallStatus = "calling" | "active";

type LiveCall = CallOutgoing | CallActive;

let client: Wavoip | null = null;
let clientToken: string | null = null;
let liveCall: LiveCall | null = null;
let endedCallback: (() => void) | null = null;
let offerUnsub: Unsubscribe | null = null;
/** Reserva o token enquanto um toque é avaliado ou o aviso está na tela. */
let incomingHeld = false;
let listenGeneration = 0;

export function isWavoipBusy() {
  return liveCall !== null || incomingHeld;
}

export function releaseWavoipIncoming() {
  incomingHeld = false;
}

export function watchWavoipOffer(offer: Offer, onGone: () => void): Unsubscribe {
  const unsubs = [
    offer.on("unanswered", onGone),
    offer.on("ended", onGone),
    offer.on("acceptedElsewhere", onGone),
    offer.on("rejectedElsewhere", onGone),
  ];
  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

export async function unlockWavoipMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      throw new Error("Permita o microfone no navegador para ligar.");
    }
    throw new Error("Não foi possível acessar o microfone.");
  }
}

async function loadClient(token: string): Promise<Wavoip> {
  const { Wavoip: WavoipClient } = await import("@wavoip/wavoip-api");
  if (client && clientToken === token) return client;
  if (client && clientToken !== token) {
    client.addDevices([token]);
    clientToken = token;
    return client;
  }
  client = new WavoipClient({
    tokens: [token],
    platform: "auttus-prospect",
    language: "pt-BR",
  });
  clientToken = token;
  return client;
}

async function waitForDevice(wavoip: Wavoip, token: string) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    const device = wavoip.getDevices().find((item) => item.token === token);
    if (device?.status === "UP" || device?.status === "open") return;
    if (device?.connectionStatus === "connected") return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function handleEnded() {
  liveCall = null;
  const cb = endedCallback;
  endedCallback = null;
  cb?.();
}

export async function listenWavoipIncoming(token: string, onOffer: (offer: Offer) => void) {
  const generation = ++listenGeneration;
  const wavoip = await loadClient(token);
  if (generation !== listenGeneration) return;
  try {
    await Promise.all(wavoip.wakeUpDevices([token]));
  } catch {
    // Dispositivo já acordado.
  }
  if (generation !== listenGeneration) return;
  offerUnsub?.();
  offerUnsub = wavoip.on("offer", (offer) => {
    if (liveCall || incomingHeld) return;
    incomingHeld = true;
    onOffer(offer);
  });
}

export function stopListeningWavoipIncoming() {
  listenGeneration += 1;
  offerUnsub?.();
  offerUnsub = null;
}

export async function acceptWavoipOffer(offer: Offer, onEnded: () => void) {
  if (liveCall) {
    throw new Error("Já existe uma ligação em curso.");
  }
  await unlockWavoipMicrophone();
  const { call, err } = await offer.accept();
  if (err || !call) {
    throw new Error(err ?? "Não foi possível atender.");
  }
  liveCall = call;
  incomingHeld = false;
  endedCallback = onEnded;
  call.on("ended", handleEnded);
  call.on("error", handleEnded);
}

export async function rejectWavoipOffer(offer: Offer) {
  await offer.reject();
}

export async function startWavoipCall(params: {
  token: string;
  phone: string;
  onActive: () => void;
  onEnded: () => void;
}): Promise<void> {
  if (liveCall || incomingHeld) {
    throw new Error("Já existe uma ligação em curso.");
  }

  await unlockWavoipMicrophone();
  const wavoip = await loadClient(params.token);
  try {
    await Promise.all(wavoip.wakeUpDevices([params.token]));
  } catch {
    // Dispositivo já acordado ou sem hibernação.
  }
  await waitForDevice(wavoip, params.token);

  const { call, err } = await wavoip.startCall({
    to: params.phone,
    fromTokens: [params.token],
  });
  if (err || !call) {
    throw new Error(err?.message ?? "Não foi possível iniciar a ligação.");
  }

  const outgoing = call;
  liveCall = outgoing;
  endedCallback = params.onEnded;

  outgoing.on("peerAccept", (active) => {
    if (liveCall !== outgoing) {
      void active.end();
      return;
    }
    liveCall = active;
    params.onActive();
    active.on("ended", handleEnded);
    active.on("error", handleEnded);
  });
  outgoing.on("peerReject", handleEnded);
  outgoing.on("unanswered", handleEnded);
  outgoing.on("ended", handleEnded);
}

export async function hangupWavoipCall() {
  const call = liveCall;
  liveCall = null;
  if (!call) return;
  try {
    await call.end();
  } finally {
    handleEnded();
  }
}

export async function setWavoipMuted(muted: boolean) {
  if (!liveCall) return;
  const result = muted ? await liveCall.mute() : await liveCall.unmute();
  if (result.err) {
    throw new Error(result.err);
  }
}

export async function setWavoipSpeaker(on: boolean) {
  const media = document.querySelectorAll("audio, video");
  if (media.length === 0) return false;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === "audiooutput");
  const speaker =
    outputs.find((device) => /speaker|alto[- ]?falante/i.test(device.label)) ?? outputs[0];
  const earpiece = outputs.find((device) =>
    /ear|phone|ouvido|headset|communication/i.test(device.label),
  );
  const sinkId = on ? (speaker?.deviceId ?? "default") : (earpiece?.deviceId ?? "");
  let applied = false;
  for (const element of media) {
    const mediaEl = element as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
    if (typeof mediaEl.setSinkId !== "function") continue;
    try {
      await mediaEl.setSinkId(sinkId);
      applied = true;
    } catch {
      // iOS e alguns browsers não deixam escolher o alto-falante.
    }
  }
  return applied;
}
