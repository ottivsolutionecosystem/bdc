import { redirect } from "next/navigation";

import { FloorEventList } from "@/components/floor/floor-event-list";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth";
import { homePathForRole, isSupervisorOrAdmin } from "@/lib/permissions";
import { listCampaignOptions, listFairEvents } from "@/server/services/floor";

const FLOOR_ROLES = ["ADMIN", "SUPERVISOR", "RECEPTIONIST", "SELLER", "APPRAISER", "FINANCE", "DELIVERY"] as const;

export default async function FloorPage() {
  const session = await auth();
  const user = session!.user;
  if (!FLOOR_ROLES.includes(user.role as (typeof FLOOR_ROLES)[number])) {
    redirect(homePathForRole(user.role));
  }

  const events = await listFairEvents(user);
  const manager = isSupervisorOrAdmin(user);
  if (!manager) {
    const active = events.filter((event) => event.status === "ACTIVE");
    if (active.length === 1) redirect(`/floor/${active[0].id}`);
  }

  const campaigns = manager ? await listCampaignOptions(user) : [];

  return (
    <div className="page-shell">
      <PageHeader
        title="Feirões"
        description="Controle da chegada do cliente até a entrega do veículo."
      />
      <FloorEventList events={events} campaigns={campaigns} canManage={manager} />
    </div>
  );
}
