"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export function IncomingCallBanner({
  name,
  phone,
  answering,
  onAccept,
  onReject,
}: {
  name: string;
  phone: string;
  answering?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal só no cliente
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[150] mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ligação recebida</p>
      <p className="mt-1 truncate text-lg font-semibold">{name}</p>
      <p className="text-sm text-muted-foreground">{phone}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="destructive" disabled={answering} onClick={onReject}>
          <PhoneOff />
          Recusar
        </Button>
        <Button disabled={answering} onClick={onAccept}>
          <Phone />
          {answering ? "Atendendo..." : "Atender"}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
