/** Configuração do Auttus (Chatwoot + app). Só no servidor. */

export type AuttusChatConfig = {
  apiBaseUrl: string;
  token: string;
  inboxId: number;
  appUrl: string;
};

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAuttusChatConfig(): AuttusChatConfig | null {
  const token = process.env.CHATWOOT_API_ACCESS_TOKEN?.trim();
  const accountId = process.env.CHATWOOT_ACCOUNT_ID?.trim();
  const inboxRaw = process.env.CHATWOOT_OFFICIAL_INBOX_ID?.trim();
  const inboxId = inboxRaw ? Number(inboxRaw) : NaN;
  if (!token || !accountId || !Number.isInteger(inboxId) || inboxId <= 0) return null;

  const chatwootUrl = trimSlash(process.env.CHATWOOT_URL?.trim() || "https://on.ottiv.io");
  const appUrl = trimSlash(process.env.AUTTUS_APP_URL?.trim() || "https://app.auttus.com");

  return {
    apiBaseUrl: `${chatwootUrl}/api/v1/accounts/${accountId}`,
    token,
    inboxId,
    appUrl,
  };
}

export function isAuttusChatConfigured() {
  return getAuttusChatConfig() !== null;
}

export function auttusConversationUrl(appUrl: string, conversationId: number) {
  return `${appUrl}/conversations?conversation=${conversationId}`;
}
