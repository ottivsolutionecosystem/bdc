export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function consumeInstallPrompt() {
  const event = deferredPrompt;
  deferredPrompt = null;
  notify();
  return event;
}

export function clearInstallPrompt() {
  deferredPrompt = null;
  notify();
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function onBeforeInstallPrompt(raw: Event) {
  raw.preventDefault();
  deferredPrompt = raw as BeforeInstallPromptEvent;
  notify();
}

function onAppInstalled() {
  deferredPrompt = null;
  notify();
}

export function bindInstallPromptListeners() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
  };
}
