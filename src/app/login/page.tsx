import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.active) {
    redirect(homePathForRole(session.user.role));
  }

  return (
    <AuthShell title="Bem-vindo de volta" description="Entre para acessar as campanhas e a operação.">
      <LoginForm />
    </AuthShell>
  );
}
