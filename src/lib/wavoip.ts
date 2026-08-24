import { normalizePhone } from "@/lib/phone";

const WAVOIP_CALL_URL = "https://app.wavoip.com/call";
const WAVOIP_POPUP_FEATURES = "width=420,height=740,scrollbars=no,resizable=yes";

/** Monta o Click to Call da Wavoip. Número no formato 55 + DDD + número. */
export function buildWavoipCallUrl(token: string, rawPhone: string, name: string): string | null {
  const { normalized, valid } = normalizePhone(rawPhone);
  if (!valid || !token.trim()) return null;
  const params = new URLSearchParams({
    token: token.trim(),
    phone: `55${normalized}`,
    name: name.trim() || "Cliente",
    start_if_ready: "true",
    close_after_call: "true",
  });
  return `${WAVOIP_CALL_URL}?${params.toString()}`;
}

/** Abre o Click to Call numa janela reutilizável, sem sair da Operação. */
export function openWavoipCall(url: string) {
  const popup = window.open(url, "wavoip", WAVOIP_POPUP_FEATURES);
  if (popup) {
    popup.focus();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
