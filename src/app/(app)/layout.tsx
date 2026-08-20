import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { AppBottomNav, AppSidebar, AppTopbar } from "@/components/layout/app-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !session.user.active) {
    redirect("/login");
  }

  const homeHref = homePathForRole(session.user.role);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[80] focus:m-3 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>
      <AppSidebar homeHref={homeHref} role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar role={session.user.role} name={session.user.name ?? session.user.email ?? "Usuário"} />
        <main id="conteudo" className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <AppBottomNav role={session.user.role} />
      </div>
    </div>
  );
}
