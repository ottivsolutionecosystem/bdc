import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { CampaignStatus, ContactStatus, ContactTemperature } from "@/generated/prisma/enums";
import {
  CAMPAIGN_STATUS_LABELS,
  CONTACT_STATUS_LABELS,
  TEMPERATURE_LABELS,
  statusBadgeVariant,
  temperatureBadgeVariant,
} from "@/lib/campaign-labels";

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{CONTACT_STATUS_LABELS[status]}</Badge>;
}

export function TemperatureBadge({ temperature }: { temperature: ContactTemperature }) {
  return <Badge variant={temperatureBadgeVariant(temperature)}>{TEMPERATURE_LABELS[temperature]}</Badge>;
}

const CAMPAIGN_STATUS_VARIANT: Record<CampaignStatus, NonNullable<VariantProps<typeof badgeVariants>["variant"]>> = {
  DRAFT: "secondary",
  ACTIVE: "status-treated",
  PAUSED: "temperature-warm",
  COMPLETED: "outline",
  CANCELED: "destructive",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={CAMPAIGN_STATUS_VARIANT[status]}>{CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}
