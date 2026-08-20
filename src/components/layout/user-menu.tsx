"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound, LogOut, Users } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/campaign-labels";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ name, role }: { name: string; role: UserRole }) {
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 rounded-full px-1.5 sm:px-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="font-medium">{name}</span>
            <Badge variant="secondary" className="w-fit font-normal">
              {ROLE_LABELS[role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === "ADMIN" && (
            <DropdownMenuItem asChild>
              <Link href="/users">
                <Users className="mr-2 size-4" />
                Usuários
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound className="mr-2 size-4" />
            Alterar senha
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-2 size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
