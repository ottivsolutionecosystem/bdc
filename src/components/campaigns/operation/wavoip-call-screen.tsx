"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, PhoneOff, Smartphone, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function RoundButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-full text-white transition-colors sm:size-20 [&_svg]:size-7",
          danger
            ? "bg-red-600 hover:bg-red-500"
            : active
              ? "bg-white text-zinc-950"
              : "bg-white/15 hover:bg-white/25",
        )}
      >
        {children}
      </span>
      <span className="text-xs font-medium text-white/80">{label}</span>
    </button>
  );
}

export function WavoipCallScreen({
  name,
  phone,
  status,
  muted,
  speakerOn,
  onMute,
  onSpeaker,
  onHangup,
}: {
  name: string;
  phone: string;
  status: "calling" | "active";
  muted: boolean;
  speakerOn: boolean;
  onMute: () => void;
  onSpeaker: () => void;
  onHangup: () => void;
}) {
  const [earMode, setEarMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal só no cliente
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status !== "active") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void sentinel?.release();
    };
  }, []);

  if (!mounted) return null;

  const screen = earMode ? (
      <button
        type="button"
        className="fixed inset-0 z-[200] flex select-none flex-col items-center justify-end bg-black px-6 pb-[max(3rem,env(safe-area-inset-bottom))] text-white"
        onClick={() => setEarMode(false)}
        aria-label="Mostrar botões da ligação"
      >
        <p className="mb-10 text-sm text-white/70">Toque para mostrar os botões</p>
      </button>
  ) : (
    <div className="fixed inset-0 z-[200] flex select-none flex-col bg-[#0b1524] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p
          className={cn(
            "text-sm tracking-wide text-white/60 uppercase",
            status === "calling" && "animate-pulse",
          )}
        >
          {status === "calling" ? "Chamando..." : "Em ligação"}
        </p>
        {status === "calling" ? (
          <div className="relative my-3 flex size-16 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-white/25 animate-ping" />
            <span className="relative size-10 rounded-full bg-white/20" />
          </div>
        ) : null}
        <h1 className="max-w-full truncate text-3xl font-semibold sm:text-4xl">{name}</h1>
        <p className="text-lg text-white/70">{phone}</p>
        <p className="mt-2 font-mono text-xl tabular-nums text-white/90">
          {status === "active" ? formatDuration(elapsed) : "—"}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-sm grid-cols-3 justify-items-center gap-y-8 pb-4">
        <RoundButton label="Mudo" active={muted} onClick={onMute}>
          {muted ? <MicOff /> : <Mic />}
        </RoundButton>
        <RoundButton label="Ouvido" onClick={() => setEarMode(true)}>
          <Smartphone />
        </RoundButton>
        <RoundButton label="Viva-voz" active={speakerOn} onClick={onSpeaker}>
          <Volume2 />
        </RoundButton>
      </div>

      <div className="flex justify-center pb-6 pt-4">
        <RoundButton label="Desligar" danger onClick={onHangup}>
          <PhoneOff />
        </RoundButton>
      </div>
    </div>
  );

  return createPortal(screen, document.body);
}
