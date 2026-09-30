"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction, type PasswordChangeState } from "../actions";

export function PasswordChangeForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState<
    PasswordChangeState,
    FormData
  >(changePasswordAction, undefined);
  const error = (field: "current" | "next" | "confirm") =>
    state?.fieldErrors?.[field]?.[0];

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message ? (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <FormField
        id="current"
        label={forced ? "Mot de passe temporaire" : "Mot de passe actuel"}
        error={error("current")}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="current"
            autoComplete="current-password"
            autoFocus
          />
        )}
      </FormField>
      <FormField
        id="next"
        label="Nouveau mot de passe"
        hint="12 caractères minimum. Une phrase de plusieurs mots est facile à retenir."
        error={error("next")}
      >
        {(props) => (
          <PasswordInput {...props} name="next" autoComplete="new-password" />
        )}
      </FormField>
      <FormField
        id="confirm"
        label="Confirmez le nouveau mot de passe"
        error={error("confirm")}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="confirm"
            autoComplete="new-password"
          />
        )}
      </FormField>

      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
