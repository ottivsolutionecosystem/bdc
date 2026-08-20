import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(homePathForRole(session.user.role));
}
