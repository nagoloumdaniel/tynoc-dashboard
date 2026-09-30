"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { login } from "../actions";

const inputClass =
  "block h-10 w-full rounded-md border bg-surface px-3 text-sm shadow-xs placeholder:text-muted-foreground aria-invalid:border-danger";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-danger">
      {errors[0]}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const emailErrors = state?.fieldErrors?.email;
  const passwordErrors = state?.fieldErrors?.password;

  return (
    <form action={action} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state?.message ? (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state?.email}
          aria-invalid={emailErrors ? true : undefined}
          aria-describedby={emailErrors ? "email-error" : undefined}
          className={inputClass}
        />
        <FieldError id="email-error" errors={emailErrors} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Mot de passe
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={passwordErrors ? true : undefined}
          aria-describedby={passwordErrors ? "password-error" : undefined}
        />
        <FieldError id="password-error" errors={passwordErrors} />
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
