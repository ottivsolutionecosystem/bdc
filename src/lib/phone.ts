export type NormalizedPhone = {
  /** Somente dígitos, DDD + número, sem código de país. Usado para dedupe. */
  normalized: string;
  valid: boolean;
  /** Formato de exibição, ex: (67) 99999-9999 */
  formatted: string;
};

/**
 * Normaliza um telefone brasileiro para DDD (2 dígitos) + número (8 ou 9
 * dígitos), removendo formatação, código de país (+55) e o dígito 0 de
 * discagem interurbana quando presente. Um telefone é considerado válido
 * quando resulta em 10 dígitos (fixo) ou 11 dígitos (celular, começando
 * com 9 após o DDD).
 */
export function normalizePhone(raw: string): NormalizedPhone {
  let digits = (raw ?? "").replace(/\D/g, "");

  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  const valid =
    (digits.length === 11 && digits[2] === "9") || digits.length === 10;

  if (!valid) {
    return { normalized: digits, valid: false, formatted: raw };
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const formatted =
    rest.length === 9
      ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
      : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;

  return { normalized: digits, valid: true, formatted };
}

/** Link do WhatsApp Web/app com DDI 55. */
export function toWhatsAppUrl(raw: string): string | null {
  const { normalized, valid } = normalizePhone(raw);
  if (!valid) return null;
  return `https://wa.me/55${normalized}`;
}
