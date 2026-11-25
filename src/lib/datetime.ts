/** Fuso operacional da Auttus Prospect: Cuiabá (UTC-4 o ano todo). */
export const APP_TIMEZONE = "America/Cuiaba";

function calendarDateInAppTz(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Dia de hoje em Cuiabá, no formato AAAA-MM-DD. */
export function todayKeyInAppTz(now = new Date()): string {
  return calendarDateInAppTz(now);
}

/** Dia de um instante em Cuiabá, no formato AAAA-MM-DD. */
export function dateKeyInAppTz(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return calendarDateInAppTz(date);
}

/** Hora cheia (0–23) de um instante em Cuiabá. */
export function hourInAppTz(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value;
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;
  const parsed = Number(hour);
  if (!Number.isFinite(parsed)) return 0;
  return parsed === 24 ? 0 : parsed;
}

/** AAAA-MM-DD para dd/mm/aaaa, sem deslocar o fuso. */
export function formatDateKey(key: string): string {
  const [year, month, day] = key.slice(0, 10).split("-");
  if (!year || !month || !day) return key;
  return `${day}/${month}/${year}`;
}

/** Meia-noite de hoje em Cuiabá. */
export function startOfTodayInAppTz(now = new Date()): Date {
  return new Date(`${calendarDateInAppTz(now)}T00:00:00-04:00`);
}

/** Início do dia seguinte em Cuiabá (exclusivo). */
export function startOfTomorrowInAppTz(now = new Date()): Date {
  return new Date(startOfTodayInAppTz(now).getTime() + 24 * 60 * 60 * 1000);
}

export const clockFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIMEZONE,
  dateStyle: "short",
  timeStyle: "short",
});
