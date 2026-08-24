"use client";

import type { MouseEvent } from "react";
import { Phone, Car, History, Calendar, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemperatureBadge } from "@/components/campaigns/status-badge";
import { toWhatsAppUrl } from "@/lib/phone";
import { buildWavoipCallUrl, openWavoipCall } from "@/lib/wavoip";
import { supervisorQueueKindLabel } from "@/lib/contact-action";
import type { QueueContact } from "@/types/campaign";

const MAX_ATTEMPTS = 3;
const purchaseDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatPurchaseDate(value: string | null) {
  if (!value) return "—";
  const calendarMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = calendarMatch
    ? new Date(Number(calendarMatch[1]), Number(calendarMatch[2]) - 1, Number(calendarMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return purchaseDateFormatter.format(date);
}

export function NextContactCard({
  contact,
  wavoipDeviceToken,
}: {
  contact: QueueContact;
  wavoipDeviceToken?: string | null;
}) {
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const whatsappUrl = toWhatsAppUrl(contact.phone);
  const wavoipUrl = wavoipDeviceToken
    ? buildWavoipCallUrl(wavoipDeviceToken, contact.phone, contact.name)
    : null;
  const telHref = !wavoipDeviceToken && phoneDigits ? `tel:${phoneDigits}` : null;
  const callHref = wavoipUrl ?? telHref;
  const wavoipUnavailable = Boolean(wavoipDeviceToken) && !wavoipUrl;

  function handleCallClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!wavoipUrl) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    openWavoipCall(wavoipUrl);
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-primary" />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Próximo contato
        </CardTitle>
        <TemperatureBadge temperature={contact.temperature} />
      </CardHeader>
      <CardContent className="space-y-4">
        {contact.supervisorQueuedAt && (
          <div className="rounded-lg border border-primary/30 bg-accent px-3 py-2 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-primary">
              <Megaphone className="size-3.5" />
              {supervisorQueueKindLabel(contact.supervisorQueueKind)}
            </p>
            {contact.supervisorQueuedBy?.name && (
              <p className="mt-1 text-muted-foreground">Por {contact.supervisorQueuedBy.name}</p>
            )}
            {contact.supervisorQueueNote && <p className="mt-1">{contact.supervisorQueueNote}</p>}
          </div>
        )}

        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cliente</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{contact.name}</p>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="mt-0.5 font-medium">{contact.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Carro que comprou</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <Car className="size-3.5 shrink-0 text-muted-foreground" />
              {contact.lastVehicle ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data da compra</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
              {formatPurchaseDate(contact.lastPurchaseDate)}
            </dd>
          </div>
        </dl>

        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <History className="size-3.5" />
          Tentativa {contact.attemptsCount + 1} de {MAX_ATTEMPTS}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {callHref ? (
            <Button asChild size="lg">
              <a
                href={callHref}
                target={wavoipUrl ? "wavoip" : undefined}
                rel={wavoipUrl ? "noreferrer" : undefined}
                onClick={handleCallClick}
                aria-label={wavoipUrl ? "Ligar pelo Wavoip" : "Ligar"}
                title={wavoipUrl ? "Liga pelo WhatsApp (Wavoip)" : undefined}
              >
                <Phone />
                Ligar
              </a>
            </Button>
          ) : wavoipUnavailable ? (
            <Button size="lg" disabled title="Telefone inválido para ligar pelo Wavoip">
              <Phone />
              Ligar
            </Button>
          ) : null}
          {whatsappUrl ? (
            <Button asChild size="lg" variant="outline">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
