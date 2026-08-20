import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isSupervisorOrAdmin } from "@/lib/permissions";
import { listCampaignImports } from "@/server/services/campaign-import";
import { ImportWizard } from "@/components/campaigns/import-wizard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!isSupervisorOrAdmin(session!.user)) {
    redirect(`/campaigns/${id}/operation`);
  }

  const imports = await listCampaignImports(id);

  return (
    <div className="page-shell !max-w-4xl">
      <ImportWizard campaignId={id} />

      {imports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de importações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Importados</TableHead>
                  <TableHead>Ignorados</TableHead>
                  <TableHead>Inválidos</TableHead>
                  <TableHead>Duplicados</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell>{item.user.name}</TableCell>
                    <TableCell>{item.totalRows}</TableCell>
                    <TableCell>{item.imported}</TableCell>
                    <TableCell>{item.ignored}</TableCell>
                    <TableCell>{item.invalid}</TableCell>
                    <TableCell>{item.duplicated}</TableCell>
                    <TableCell>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
