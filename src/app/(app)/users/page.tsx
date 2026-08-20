import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { listUsers } from "@/server/services/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersAdmin } from "@/components/users/users-admin";
import { PageHeader } from "@/components/layout/page-header";

export default async function UsersPage() {
  const session = await auth();
  const user = session!.user;
  if (user.role !== "ADMIN") {
    redirect(homePathForRole(user.role));
  }

  const users = await listUsers(user);

  return (
    <div className="page-shell">
      <PageHeader
        title="Usuários"
        description="Cadastre agentes, supervisores e vendedores para operar as campanhas."
      />
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Desativar um usuário impede o login na próxima sessão.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersAdmin users={users} currentUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
