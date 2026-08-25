"use client";

import { useEffect } from "react";

import { bindInstallPromptListeners } from "@/lib/pwa-install";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    // Sem SW o Chrome Android não oferece "Instalar app".
  }
}

export function PwaRegister() {
  useEffect(() => {
    const unbind = bindInstallPromptListeners();
    const onLoad = () => {
      void registerServiceWorker();
    };
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
    return () => {
      unbind?.();
      window.removeEventListener("load", onLoad);
    };
  }, []);
  return null;
}
