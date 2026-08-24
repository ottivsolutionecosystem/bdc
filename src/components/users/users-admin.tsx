"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ROLE_LABELS } from "@/lib/campaign-labels";
import { userRoleValues } from "@/schemas/user";
import type { UserRole } from "@/generated/prisma/enums";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  wavoipDeviceToken: string | null;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "AGENT" as UserRole,
  active: true,
  wavoipDeviceToken: "",
};

export function UsersAdmin({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
      wavoipDeviceToken: user.wavoipDeviceToken ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const body = editing
        ? { ...form, password: form.password || undefined }
        : form;
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível salvar o usuário.");
        return;
      }
      toast.success(editing ? "Usuário atualizado." : "Usuário criado.");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: UserRow, active: boolean) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível atualizar o acesso.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus />
              Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
              <DialogDescription>
                Agentes, supervisores e vendedores passam a operar depois de criados aqui.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nome</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">{editing ? "Nova senha (opcional)" : "Senha"}</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-wavoip">Token Wavoip (ligação na Operação)</Label>
                <Input
                  id="user-wavoip"
                  value={form.wavoipDeviceToken}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, wavoipDeviceToken: event.target.value }))
                  }
                  placeholder="Cole o token do dispositivo"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Com o token, o botão Ligar da agente discá pelo WhatsApp (Wavoip). Sem token, usa o
                  telefone do aparelho.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoleValues.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Wavoip</TableHead>
            <TableHead>Acesso</TableHead>
            <TableHead className="text-right">Editar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {user.wavoipDeviceToken ? "Configurado" : "—"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={user.active}
                    disabled={user.id === currentUserId}
                    onCheckedChange={(checked) => handleToggleActive(user, checked)}
                  />
                  <span className="text-xs text-muted-foreground">{user.active ? "Ativo" : "Inativo"}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
