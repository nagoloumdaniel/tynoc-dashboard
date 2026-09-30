"use client";

import { UserPlusIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input, Select } from "@/components/ui/field";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import { createAdminAction, type CreateAdminState } from "../actions";
import { TemporaryPassword } from "./temporary-password";

function CreateAdminForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<CreateAdminState, FormData>(
    createAdminAction,
    undefined,
  );

  if (state?.ok) {
    return (
      <TemporaryPassword
        name={state.name}
        password={state.temporaryPassword}
        onDone={onDone}
      />
    );
  }

  const error = (field: "name" | "email" | "role") =>
    state?.fieldErrors?.[field]?.[0];

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      <FormField id="admin-name" label="Nom" error={error("name")}>
        {(props) => (
          <Input
            {...props}
            name="name"
            defaultValue={state?.values?.name}
            autoFocus
          />
        )}
      </FormField>
      <FormField id="admin-email" label="Email" error={error("email")}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            defaultValue={state?.values?.email}
          />
        )}
      </FormField>
      <FormField
        id="admin-role"
        label="Rôle"
        hint="Lecture seule : consultation sans modification."
        error={error("role")}
      >
        {(props) => (
          <Select
            {...props}
            name="role"
            defaultValue={state?.values?.role ?? "ADMIN"}
          >
            {ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {state?.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}

export function CreateAdminDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setKey((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon aria-hidden />
          Ajouter un administrateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Nouvel administrateur</DialogTitle>
        <DialogDescription>
          Un mot de passe temporaire est généré ; il devra être changé à la
          première connexion.
        </DialogDescription>
        <CreateAdminForm key={key} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
