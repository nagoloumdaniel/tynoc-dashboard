"use client";

import { AlertDialog } from "radix-ui";
import { type ReactNode, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Confirmation for destructive or impactful actions. Stays open with the
 * error when the action fails; `confirmationText` forces typing a value
 * (e.g. the SKU) before the button unlocks.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "danger",
  confirmationText,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  confirmationText?: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  const locked = confirmationText !== undefined && typed !== confirmationText;

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setError(undefined);
    }
  }

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        setOpen(false);
        setTyped("");
        setError(undefined);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-surface p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none">
          <AlertDialog.Title className="text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>

          {confirmationText !== undefined ? (
            <div className="mt-4">
              <label htmlFor={inputId} className="mb-1.5 block text-sm">
                Tapez <strong className="font-mono">{confirmationText}</strong>{" "}
                pour confirmer
              </label>
              <Input
                id={inputId}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                Annuler
              </Button>
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: it would close before the async result. */}
            <Button
              variant={tone}
              disabled={locked || pending}
              onClick={confirm}
            >
              {pending ? "Patientez…" : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
