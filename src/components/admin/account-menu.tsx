"use client";

import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions";
import { type AdminRole, ROLE_LABELS } from "@/lib/auth/permissions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: AdminRole;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-muted data-[state=open]:bg-surface-muted"
        aria-label={`Compte de ${name}`}
      >
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        >
          {initials(name)}
        </span>
        <span className="hidden max-w-40 truncate font-medium sm:inline">
          {name}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => startTransition(() => logout())}
        >
          <LogOutIcon aria-hidden />
          {pending ? "Déconnexion…" : "Se déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
