"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallPwaButton() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function onPrompt(raw: Event) {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!event && !ios) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          if (event) {
            await event.prompt();
            setEvent(null);
            return;
          }
          setIosOpen(true);
        }}
      >
        <Download />
        Instalar
      </Button>
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar como aplicativo</DialogTitle>
            <DialogDescription>
              No iPhone o Safari não instala sozinho. Abra pelo ícone da tela inicial para sumirem a barra do site e a barra de baixo.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
            <li>
              Toque em <Share className="mx-0.5 inline size-4 align-text-bottom" /> <strong>Compartilhar</strong> na barra do Safari.
            </li>
            <li>
              Role e toque em <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Feche o Safari e abra o ícone <strong>Auttus</strong> na tela inicial — não abra pelo Safari de novo.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
