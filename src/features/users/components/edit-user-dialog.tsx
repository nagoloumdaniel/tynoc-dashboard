"use client";

import { PencilIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input } from "@/components/ui/field";
import { type UserFormState, updateUserAction } from "../actions";

type Editable = {
  id: string;
  version: number;
  name: string;
  email: string;
  phone?: string;
};

function EditUserForm({
  user,
  onSaved,
}: {
  user: Editable;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(
    updateUserAction,
    undefined,
  );
  const handleSaved = useEffectEvent(onSaved);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      handleSaved();
    }
  }, [state]);

  const values = state && !state.ok ? state.values : undefined;
  const error = (field: "name" | "email" | "phone") =>
    state && !state.ok ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="version" value={user.version} />
      <FormField id="user-name" label="Nom" error={error("name")}>
        {(props) => (
          <Input
            {...props}
            name="name"
            defaultValue={values?.name ?? user.name}
          />
        )}
      </FormField>
      <FormField id="user-email" label="Email" error={error("email")}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            defaultValue={values?.email ?? user.email}
          />
        )}
      </FormField>
      <FormField
        id="user-phone"
        label="Téléphone (facultatif)"
        error={error("phone")}
      >
        {(props) => (
          <Input
            {...props}
            name="phone"
            type="tel"
            defaultValue={values?.phone ?? user.phone ?? ""}
          />
        )}
      </FormField>
      {state && !state.ok && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export function EditUserDialog({ user }: { user: Editable }) {
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
        <Button variant="outline">
          <PencilIcon aria-hidden />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Modifier le compte</DialogTitle>
        <EditUserForm key={key} user={user} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
