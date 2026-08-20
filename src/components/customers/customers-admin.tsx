"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  _count: { campaignContacts: number; opportunities: number; appointments: number };
};

export function CustomersAdmin({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", document: "" });
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (editing ? "Editar cliente" : "Novo cliente"), [editing]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", document: "" });
    setOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      document: customer.document ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const response = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.error ?? "Não foi possível salvar o cliente.");
        return;
      }
      toast.success(editing ? "Cliente atualizado." : "Cliente criado.");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus />
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome</Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Telefone</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">E-mail</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-document">Documento</Label>
                  <Input
                    id="customer-document"
                    value={form.document}
                    onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Campanhas</TableHead>
              <TableHead>Oportunidades</TableHead>
              <TableHead className="text-right">Editar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.email ?? "—"}</TableCell>
                <TableCell>{customer._count.campaignContacts}</TableCell>
                <TableCell>{customer._count.opportunities}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(customer)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
