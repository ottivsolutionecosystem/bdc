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
