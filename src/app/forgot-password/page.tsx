import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Redefinir senha"
      description="Informe o e-mail da sua conta."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Voltar ao login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
