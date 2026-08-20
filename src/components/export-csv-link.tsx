import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportCsvLink({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href}>
        <Download />
        {label}
      </a>
    </Button>
  );
}
