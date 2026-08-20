import { BrandWordmark } from "@/components/brand/logo";
import { InstallPwaButton } from "@/components/pwa/install-pwa-button";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-center bg-brand-navy px-8 py-8">
            <BrandWordmark onDark className="h-11 w-auto max-w-[240px] object-contain" />
          </div>
          <div className="space-y-1 px-6 pt-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="p-6 pt-4">{children}</div>
        </div>
        {footer}
        <div className="flex justify-center">
          <InstallPwaButton />
        </div>
      </div>
    </div>
  );
}
