"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_TARGET_FIELD_LABELS, importTargetFields, type ImportTargetField } from "@/schemas/import";

const REQUIRED_FIELDS: ImportTargetField[] = ["name", "phone"];
const IGNORE_VALUE = "__ignore__";

type AnalyzeResult = {
  importSessionId: string;
  headers: string[];
  totalRows: number;
  sampleRows: string[][];
  suggestedMapping: Partial<Record<ImportTargetField, number>>;
};

type PreviewResult = {
  totalRows: number;
  validPhones: number;
  invalidPhones: number;
  duplicatesInFile: number;
  existingInCampaign: number;
  importableCount: number;
  sampleInvalid: { name: string; phone: string }[];
};

type CommitResult = {
  imported: number;
  ignored: number;
  invalid: number;
  duplicated: number;
  totalRows: number;
};

export function ImportWizard({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "done">("upload");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportTargetField, number | null>>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/campaigns/${campaignId}/imports/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível ler o arquivo.");
        return;
      }
      const data: AnalyzeResult = await response.json();
      setAnalysis(data);
      setMapping(data.suggestedMapping);
      setStep("mapping");
    } finally {
      setLoading(false);
    }
  }

  function isMappingValid() {
    return REQUIRED_FIELDS.every((field) => typeof mapping[field] === "number");
  }

  async function handlePreview() {
    if (!analysis || !isMappingValid()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/imports/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importSessionId: analysis.importSessionId,
          mapping: {
            name: mapping.name,
            phone: mapping.phone,
            lastVehicle: mapping.lastVehicle ?? null,
            lastPurchaseDate: mapping.lastPurchaseDate ?? null,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível analisar os dados.");
        return;
      }
      setPreview(await response.json());
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!analysis) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/imports/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importSessionId: analysis.importSessionId,
          mapping: {
            name: mapping.name,
            phone: mapping.phone,
            lastVehicle: mapping.lastVehicle ?? null,
            lastPurchaseDate: mapping.lastPurchaseDate ?? null,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível concluir a importação.");
        return;
      }
      const data: CommitResult = await response.json();
      setCommitResult(data);
      setStep("done");
      toast.success("Importação concluída e contatos distribuídos entre as agentes.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setAnalysis(null);
    setMapping({});
    setPreview(null);
    setCommitResult(null);
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Importar base de clientes
          </CardTitle>
          <CardDescription>Envie um arquivo .csv ou .xlsx com os clientes desta campanha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">Arquivo</Label>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xlsm,.xls"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">Lendo arquivo...</p>}
        </CardContent>
      </Card>
    );
  }

  if (step === "mapping" && analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapear colunas</CardTitle>
          <CardDescription>
            {analysis.totalRows} linha(s) encontrada(s) em &quot;{analysis.headers.length} colunas&quot;. Associe cada
            campo do CRM à coluna correspondente no arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {importTargetFields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label>
                  {IMPORT_TARGET_FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={
                    typeof mapping[field] === "number" ? String(mapping[field]) : IGNORE_VALUE
                  }
                  onValueChange={(value) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field]: value === IGNORE_VALUE ? null : Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {!REQUIRED_FIELDS.includes(field) && (
                      <SelectItem value={IGNORE_VALUE}>Ignorar</SelectItem>
                    )}
                    {analysis.headers.map((header, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {header || `Coluna ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {analysis.sampleRows.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Prévia do arquivo</Label>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {analysis.headers.map((header, index) => (
                        <TableHead key={index}>{header || `Coluna ${index + 1}`}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.sampleRows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {analysis.headers.map((_, colIndex) => (
                          <TableCell key={colIndex}>{row[colIndex]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={handlePreview} disabled={!isMappingValid() || loading}>
              {loading ? "Analisando..." : "Analisar dados"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview" && preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmar importação</CardTitle>
          <CardDescription>Revise o resultado antes de confirmar. Os contatos válidos serão distribuídos automaticamente entre as agentes ativas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PreviewStat label="Total de registros" value={preview.totalRows} />
            <PreviewStat label="Telefones válidos" value={preview.validPhones} />
            <PreviewStat label="Telefones inválidos" value={preview.invalidPhones} tone="warn" />
            <PreviewStat label="Duplicados no arquivo" value={preview.duplicatesInFile} tone="warn" />
            <PreviewStat label="Já existentes na campanha" value={preview.existingInCampaign} tone="warn" />
            <PreviewStat label="Serão importados" value={preview.importableCount} tone="positive" />
          </div>

          {preview.sampleInvalid.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Exemplos de registros inválidos</Label>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sampleInvalid.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.name || "—"}</TableCell>
                        <TableCell>{row.phone || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep("mapping")}>
              Voltar
            </Button>
            <Button onClick={handleCommit} disabled={loading || preview.importableCount === 0}>
              <Upload />
              {loading ? "Importando..." : `Confirmar importação (${preview.importableCount})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "done" && commitResult) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="size-10 text-status-treated" />
          <p className="text-lg font-medium">Importação concluída</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {commitResult.imported} contato(s) importado(s) e distribuído(s) entre as agentes ativas.
          </p>
          <Button variant="outline" onClick={reset}>
            Importar outro arquivo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn" | "positive";
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "text-xl font-semibold text-temperature-warm"
            : tone === "positive"
              ? "text-xl font-semibold text-status-treated"
              : "text-xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
