"use client";

import { ChevronDownIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { THEMES } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions";
import { initials } from "@/lib/format";
import { type AdminRole, ROLE_LABELS } from "@/lib/auth/permissions";

export function AccountMenu({
  name,
  email,
  role,
  canChangePassword = true,
}: {
  name: string;
  email: string;
  role: AdminRole;
  /** False for the shared demo account. */
  canChangePassword?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

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
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Thème
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEMES.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {canChangePassword ? (
          <DropdownMenuItem asChild>
            <Link href="/compte/mot-de-passe">
              <KeyRoundIcon aria-hidden />
              Changer mon mot de passe
            </Link>
          </DropdownMenuItem>
        ) : null}
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
