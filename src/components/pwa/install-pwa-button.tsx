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
import {
  consumeInstallPrompt,
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";

type HelpKind = "ios" | "android" | null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallPwaButton() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [help, setHelp] = useState<HelpKind>(null);

  useEffect(() => {
    const apply = () => {
      if (isStandalone()) {
        setInstalled(true);
        return;
      }
      const ua = window.navigator.userAgent;
      setIos(/iphone|ipad|ipod/i.test(ua));
      setAndroid(/android/i.test(ua));
      setCanPrompt(Boolean(getDeferredInstallPrompt()));
    };
    const frame = window.requestAnimationFrame(apply);
    const unsubscribe = subscribeInstallPrompt(() => {
      setCanPrompt(Boolean(getDeferredInstallPrompt()));
      if (isStandalone()) setInstalled(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);

  if (installed) return null;
  if (!canPrompt && !ios && !android) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const event = consumeInstallPrompt();
          if (event) {
            await event.prompt();
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
              No iPhone o Safari não instala sozinho. Abra pelo ícone da tela inicial para
              sumirem a barra do site e a barra de baixo.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
            <li>
              Toque em <Share className="mx-0.5 inline size-4 align-text-bottom" />{" "}
              <strong>Compartilhar</strong> na barra do Safari.
            </li>
            <li>
              Role e toque em <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Feche o Safari e abra o ícone <strong>Auttus</strong> na tela inicial — não abra
              pelo Safari de novo.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
      <Dialog open={help === "android"} onOpenChange={(open) => setHelp(open ? "android" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar como aplicativo</DialogTitle>
            <DialogDescription>
              No Android as barras do Chrome só somem depois de <strong>Instalar app</strong>.
              Um atalho da tela inicial continua abrindo o site no navegador.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground">
            <li>
              Abra <strong>{typeof window === "undefined" ? "o site" : window.location.origin}</strong> no{" "}
              <strong>Chrome</strong> (não pelo WhatsApp, Instagram ou aba anônima).
            </li>
            <li>Recarregue a página de login e espere uns 10 segundos.</li>
            <li>
              Toque em <MoreVertical className="mx-0.5 inline size-4 align-text-bottom" /> e
              depois em <strong>Instalar app</strong> ou <strong>Instalar aplicativo</strong>.
            </li>
            <li>
              Se aparecer só <strong>Adicionar à tela inicial</strong>, isso ainda abre o Chrome
              com as barras. Feche, abra de novo no Chrome e procure <strong>Instalar app</strong>.
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
