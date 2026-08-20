"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function RedistributeAllButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleRedistribute() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/redistribute`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível redistribuir a base.");
        return;
      }
      const data = await response.json();
      toast.success(`${data.redistributed} contato(s) redistribuído(s) entre as agentes ativas.`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={submitting}>
          <Shuffle />
          Redistribuir toda a base
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Redistribuir toda a base da campanha?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os contatos serão reatribuídos do zero, inclusive convertidos. Para leads
            indefinidos (retorno atrasado ou não localizado), use Contatos → Precisa de ação.
            O histórico de tentativas é preservado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRedistribute}>Redistribuir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
