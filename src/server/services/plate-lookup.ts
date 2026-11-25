import { ApiError } from "@/lib/api-error";

export type PlateLookupResult = {
  configured: boolean;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fipeValueCents: number | null;
  fipeLabel: string | null;
};

export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseBrlToCents(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw * 100);
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\s/g, "").replace("R$", "");
  const normalized = digits.includes(",") ? digits.replace(/\./g, "").replace(",", ".") : digits;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function yearFrom(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const year = Number(raw.replace(/\D/g, "").slice(0, 4));
  return Number.isFinite(year) && year > 1950 ? year : null;
}

export async function lookupPlate(rawPlate: string): Promise<PlateLookupResult> {
  const plate = normalizePlate(rawPlate);
  if (plate.length < 7 || plate.length > 8) {
    throw new ApiError(422, "Informe uma placa válida");
  }

  const token = process.env.APIBRASIL_TOKEN?.trim();
  if (!token) {
    return {
      configured: false,
      plate,
      brand: null,
      model: null,
      year: null,
      fipeValueCents: null,
      fipeLabel: null,
    };
  }

  const response = await fetch("https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tipo: "fipe", placa: plate }),
    cache: "no-store",
  });

  const payload = asRecord(await response.json().catch(() => null));
  if (!response.ok || payload?.error === true) {
    const message = text(payload?.message);
    throw new ApiError(502, message ?? "A consulta da placa não respondeu. Preencha a FIPE manualmente.");
  }

  const body = asRecord(payload?.data);
  const rows = Array.isArray(body?.data) ? body.data : [];
  const records = rows.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
  const chosen = records.find((item) => item.principal === true) ?? records[0];
  const cents = parseBrlToCents(chosen?.valor);

  return {
    configured: true,
    plate,
    brand: text(chosen?.marca),
    model: text(chosen?.modelo),
    year: yearFrom(chosen?.anoModelo) ?? yearFrom(chosen?.anoFabricacao),
    fipeValueCents: cents,
    fipeLabel: cents == null ? null : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  };
}
