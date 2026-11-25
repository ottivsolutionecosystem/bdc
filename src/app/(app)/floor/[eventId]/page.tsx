import Link from "next/link";
import { redirect } from "next/navigation";

import { CloseFairButton } from "@/components/floor/close-fair-button";
import { FloorWorkspace } from "@/components/floor/floor-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { auth } from "@/lib/auth";
import { FAIR_EVENT_STATUS_LABELS } from "@/lib/floor-labels";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import { listFairControl, listFairStaff } from "@/server/services/fair-control";
import {
  getFairEvent,
  listAttendingSellerIds,
  listFairVehicles,
  listFinanceUsers,
  listReceptionists,
  listSellers,
  listVisits,
} from "@/server/services/floor";

export default async function FairEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  const user = session!.user;
  const { eventId } = await params;

  let event: Awaited<ReturnType<typeof getFairEvent>>;
  try {
    event = await getFairEvent(user, eventId);
  } catch (error) {
    if (error instanceof ApiError) redirect("/floor");
    throw error;
  }

  const manager = isSupervisorOrAdmin(user);
  const [vehicles, visits, sellers, receptionists, financeUsers, busySellerIds, control, staff] = await Promise.all([
    listFairVehicles(user, eventId),
    listVisits(user, eventId),
    listSellers(),
    listReceptionists(),
    listFinanceUsers(),
    listAttendingSellerIds(user, eventId),
    manager ? listFairControl(user, eventId) : Promise.resolve(null),
    manager ? listFairStaff() : Promise.resolve([]),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        title={event.name}
        description={[event.location, event.campaign?.name, FAIR_EVENT_STATUS_LABELS[event.status]]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/floor">Feirões</Link>
            </Button>
            {isSupervisorOrAdmin(user) && event.status === "ACTIVE" ? (
              <CloseFairButton eventId={event.id} />
            ) : null}
          </div>
        }
      />
      <FloorWorkspace
        role={user.role}
        eventId={event.id}
        sellers={sellers}
        receptionists={receptionists}
        currentUserId={user.role === "RECEPTIONIST" || user.role === "SELLER" ? user.id : undefined}
        busySellerIds={busySellerIds}
        financeUsers={financeUsers}
        vehicles={vehicles}
        visits={visits}
        control={control}
        staff={staff}
        eventStatus={event.status}
      />
    </div>
  );
}
