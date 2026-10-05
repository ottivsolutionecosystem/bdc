import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { normalizePhone, toE164Phone } from "@/lib/phone";
import { toWavoipPhone } from "@/lib/wavoip";
import { assertCampaignOperable } from "@/lib/campaign-lifecycle";
import type { SessionUser } from "@/lib/permissions";
import {
  auttusConversationUrl,
  getAuttusChatConfig,
  type AuttusChatConfig,
} from "@/lib/auttus-chat";

type ChatwootContact = {
  id?: number;
  name?: string;
  phone_number?: string | null;
  contact_inboxes?: Array<{
    source_id?: string;
    inbox?: { id?: number };
    inbox_id?: number;
  }>;
};

type ChatwootConversation = {
  id?: number;
  inbox_id?: number;
  status?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapContact(payload: unknown): ChatwootContact | null {
  const root = asRecord(payload);
  if (!root) return null;
  const wrapper = asRecord(root.payload) ?? asRecord(root.data) ?? root;
  const candidates = [
    asRecord(wrapper?.contact),
    asRecord(asRecord(root.payload)?.contact),
    asRecord(root.contact),
    wrapper,
    root,
  ];
  let contact: ChatwootContact | null = null;
  for (const candidate of candidates) {
    if (candidate && typeof candidate.id === "number") {
      contact = candidate as ChatwootContact;
      break;
    }
  }
  if (!contact) return null;

  const wrapperInboxes = wrapper?.contact_inboxes;
  if (Array.isArray(wrapperInboxes) && !contact.contact_inboxes?.length) {
    return { ...contact, contact_inboxes: wrapperInboxes as ChatwootContact["contact_inboxes"] };
  }
  return contact;
}

function unwrapContactList(payload: unknown): ChatwootContact[] {
  const root = asRecord(payload);
  const list = root?.payload ?? root?.data ?? payload;
  if (!Array.isArray(list)) {
    const single = unwrapContact(payload);
    return single ? [single] : [];
  }
  return list.flatMap((item) => {
    const contact = unwrapContact(item) ?? (typeof asRecord(item)?.id === "number" ? (item as ChatwootContact) : null);
    return contact ? [contact] : [];
  });
}

function unwrapConversations(payload: unknown): ChatwootConversation[] {
  const root = asRecord(payload);
  const list = root?.payload ?? payload;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is ChatwootConversation => typeof asRecord(item)?.id === "number");
}

function unwrapConversation(payload: unknown): ChatwootConversation | null {
  const root = asRecord(payload);
  if (!root) return null;
  const nested = asRecord(root.payload) ?? asRecord(root.data) ?? root;
  return typeof nested.id === "number" ? (nested as ChatwootConversation) : null;
}

function phonesMatch(left: string | null | undefined, right: string) {
  if (!left) return false;
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  return a.valid && b.valid && a.normalized === b.normalized;
}

function sourceIdForInbox(contact: ChatwootContact, inboxId: number, fallback: string) {
  const match = contact.contact_inboxes?.find((item) => item.inbox?.id === inboxId || item.inbox_id === inboxId);
  const existing = match?.source_id?.trim();
  return existing || fallback;
}

async function chatwootFetch(
  config: AuttusChatConfig,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      api_access_token: config.token,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { message: text };
    }
  }

  if (!response.ok) {
    const body = asRecord(json);
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      `Auttus respondeu ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(502, "Token do Auttus inválido. Confira CHATWOOT_API_ACCESS_TOKEN.");
    }
    throw new ApiError(502, message);
  }

  return json;
}

async function getContact(config: AuttusChatConfig, contactId: number): Promise<ChatwootContact | null> {
  const json = await chatwootFetch(config, `/contacts/${contactId}`);
  return unwrapContact(json);
}

async function searchContact(config: AuttusChatConfig, phone: string): Promise<ChatwootContact | null> {
  const queries = [...new Set([phone, phone.replace(/^\+/, ""), phone.replace(/\D/g, "")])];
  for (const query of queries) {
    const json = await chatwootFetch(config, `/contacts/search?q=${encodeURIComponent(query)}`);
    const match = unwrapContactList(json).find((item) => phonesMatch(item.phone_number, phone));
    if (match) return match;
  }
  return null;
}

async function createContact(
  config: AuttusChatConfig,
  name: string,
  phone: string,
): Promise<ChatwootContact> {
  try {
    const json = await chatwootFetch(config, "/contacts", {
      method: "POST",
      body: JSON.stringify({
        name,
        phone_number: phone,
        inbox_id: config.inboxId,
      }),
    });
    const created = unwrapContact(json);
    if (!created) throw new ApiError(502, "O Auttus criou o contato sem devolver o id.");
    return created;
  } catch (error) {
    if (error instanceof ApiError && /already been taken|já está em uso/i.test(error.message)) {
      const existing = await searchContact(config, phone);
      if (existing) return existing;
    }
    throw error;
  }
}

async function findInboxConversation(
  config: AuttusChatConfig,
  contactId: number,
): Promise<ChatwootConversation | null> {
  const json = await chatwootFetch(config, `/contacts/${contactId}/conversations`);
  const conversations = unwrapConversations(json).filter((item) => item.inbox_id === config.inboxId);
  return (
    conversations.find((item) => item.status === "open") ??
    conversations.find((item) => item.status === "pending") ??
    conversations[0] ??
    null
  );
}

async function createConversation(
  config: AuttusChatConfig,
  contact: ChatwootContact,
  sourceId: string,
): Promise<ChatwootConversation> {
  try {
    const json = await chatwootFetch(config, "/conversations", {
      method: "POST",
      body: JSON.stringify({
        source_id: sourceId,
        inbox_id: config.inboxId,
        contact_id: contact.id,
        status: "open",
      }),
    });
    const created = unwrapConversation(json);
    if (!created?.id) throw new ApiError(502, "O Auttus não devolveu a conversa criada.");
    return created;
  } catch (error) {
    const existing = contact.id ? await findInboxConversation(config, contact.id) : null;
    if (existing) return existing;
    throw error;
  }
}

export async function openAuttusConversation(
  user: SessionUser,
  campaignId: string,
  contactId: string,
) {
  const config = getAuttusChatConfig();
  if (!config) {
    throw new ApiError(503, "Conversa no Auttus ainda não está configurada.");
  }

  await assertCampaignOperable(campaignId);

  const contact = await prisma.campaignContact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true, assignedAgentId: true, name: true, phone: true },
  });
  if (!contact || contact.campaignId !== campaignId) {
    throw new ApiError(404, "Contato não encontrado nesta campanha");
  }
  if (user.role === "AGENT" && contact.assignedAgentId !== user.id) {
    throw new ApiError(403, "Este contato não está atribuído a você");
  }

  const e164 = toE164Phone(contact.phone);
  const sourceId = toWavoipPhone(contact.phone);
  if (!e164 || !sourceId) {
    throw new ApiError(422, "Telefone inválido para abrir conversa no Auttus.");
  }

  let auttusContact = await searchContact(config, e164);
  if (!auttusContact) {
    auttusContact = await createContact(config, contact.name, e164);
  }
  if (auttusContact.id) {
    auttusContact = (await getContact(config, auttusContact.id)) ?? auttusContact;
  }

  const existing = auttusContact.id ? await findInboxConversation(config, auttusContact.id) : null;
  const conversation =
    existing ?? (await createConversation(config, auttusContact, sourceIdForInbox(auttusContact, config.inboxId, sourceId)));

  if (!conversation.id) {
    throw new ApiError(502, "Não foi possível abrir a conversa no Auttus.");
  }

  return {
    conversationId: conversation.id,
    created: !existing,
    url: auttusConversationUrl(config.appUrl, conversation.id),
  };
}
