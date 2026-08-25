import { normalizePhone } from "@/lib/phone";

/** Número no formato 55 + DDD + número, para a API da Wavoip. */
export function toWavoipPhone(raw: string): string | null {
  const { normalized, valid } = normalizePhone(raw);
  if (valid) return `55${normalized}`;

  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}
