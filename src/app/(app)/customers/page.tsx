import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole, isSupervisorOrAdmin } from "@/lib/permissions";
import { listCustomers } from "@/server/services/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersAdmin } from "@/components/customers/customers-admin";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  if (!isSupervisorOrAdmin(user)) {
    redirect(homePathForRole(user.role));
  }

  const { q } = await searchParams;
  const customers = await listCustomers(user, q);

  return (
    <div className="page-shell">
      <PageHeader
        title="Clientes"
        description="Cadastro geral reutilizado pelas campanhas e pelo comercial."
      />
      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou e-mail" />
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Base de clientes</CardTitle>
          <CardDescription>A ficha da campanha também atualiza este cadastro.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomersAdmin customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
