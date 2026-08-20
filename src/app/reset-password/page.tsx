import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Nova senha"
      description="Defina uma senha com pelo menos 8 caracteres."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Voltar ao login
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}
