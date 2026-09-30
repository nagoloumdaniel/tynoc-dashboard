"use client";

import { ShieldIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { changeUserRoleAction } from "../actions";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "../types";
import { TemporaryPassword } from "./temporary-password";

export function RoleDialog({
  user,
}: {
  user: { id: string; version: number; name: string; role: UserRole };
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState<string>();
  const [temporaryPassword, setTemporaryPassword] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await changeUserRoleAction(user.id, user.version, role);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      if (result.temporaryPassword)
        setTemporaryPassword(result.temporaryPassword);
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setRole(user.role);
          setError(undefined);
          setTemporaryPassword(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShieldIcon aria-hidden />
          Changer le rôle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Rôle de {user.name}</DialogTitle>
        {temporaryPassword ? (
          <TemporaryPassword
            name={user.name}
            password={temporaryPassword}
            onDone={() => setOpen(false)}
          />
        ) : (
          <>
            <DialogDescription>
              Le compte est déconnecté de toutes ses sessions. Un client promu
              administrateur reçoit un mot de passe temporaire.
            </DialogDescription>
            <div className="mt-5">
              <Label htmlFor="role-select">Rôle</Label>
              <Select
                id="role-select"
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                options={USER_ROLES.map((value) => ({
                  value,
                  label: USER_ROLE_LABELS[value],
                }))}
              />
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <Button onClick={submit} disabled={pending || role === user.role}>
                {pending ? "Enregistrement…" : "Changer le rôle"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
