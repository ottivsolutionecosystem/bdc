"use client";

import { useEffect, useState } from "react";
import { Download, MoreVertical, Share } from "lucide-react";

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

type HelpKind = "ios" | "android" | null;

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
  const [android, setAndroid] = useState(false);
  const [help, setHelp] = useState<HelpKind>(null);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua));
    setAndroid(/android/i.test(ua));

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
  if (!event && !ios && !android) return null;

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
          setHelp(ios ? "ios" : "android");
        }}
      >
        <Download />
        Instalar
      </Button>
      <Dialog open={help === "ios"} onOpenChange={(open) => setHelp(open ? "ios" : null)}>
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
      <Dialog open={help === "android"} onOpenChange={(open) => setHelp(open ? "android" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar como aplicativo</DialogTitle>
            <DialogDescription>
              No Android as barras do Chrome só somem se você instalar o app. Um atalho da tela inicial continua abrindo o site no navegador.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
            <li>
              Abra o site no <strong>Chrome</strong> (não pelo WhatsApp nem por outro app).
            </li>
            <li>
              Toque em <MoreVertical className="mx-0.5 inline size-4 align-text-bottom" /> e depois em <strong>Instalar app</strong> ou <strong>Instalar aplicativo</strong>.
            </li>
            <li>
              Se aparecer só <strong>Adicionar à tela inicial</strong>, isso ainda abre o Chrome com as barras. Procure <strong>Instalar app</strong>.
            </li>
            <li>
              Abra o <strong>Auttus</strong> pela lista de aplicativos, não pela aba do Chrome.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
