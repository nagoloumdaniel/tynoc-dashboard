"use client";

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
import { FormField, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { adjustStockAction } from "../actions";
import { STOCK_REASON_LABELS, STOCK_REASONS } from "../schemas";

type Mode = "DELTA" | "SET";

export function StockDialog({
  product,
  trigger,
}: {
  product: { id: string; name: string; version: number; stock: number };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("DELTA");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const parsed = /^-?\d+$/.test(quantity.trim()) ? Number(quantity) : null;
  const next =
    parsed === null ? null : mode === "SET" ? parsed : product.stock + parsed;

  function reset() {
    setMode("DELTA");
    setQuantity("");
    setReason("");
    setNote("");
    setErrors(undefined);
    setMessage(undefined);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await adjustStockAction(product.id, product.version, {
        mode,
        quantity,
        reason,
        note,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        reset();
      } else {
        setErrors(result.fieldErrors);
        setMessage(result.fieldErrors ? undefined : result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Ajuster le stock</DialogTitle>
        <DialogDescription>
          {product.name} : {product.stock} en stock actuellement.
        </DialogDescription>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <div
            role="radiogroup"
            aria-label="Type d'ajustement"
            className="grid grid-cols-2 gap-1 rounded-md border bg-surface-muted p-1"
          >
            {(
              [
                ["DELTA", "Ajouter ou retirer"],
                ["SET", "Fixer la quantité"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "h-8 rounded text-sm transition-colors",
                  mode === value
                    ? "bg-surface font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <FormField
            id="stock-quantity"
            label={mode === "DELTA" ? "Variation" : "Nouvelle quantité"}
            hint={
              mode === "DELTA"
                ? "Nombre positif pour ajouter, négatif pour retirer (ex. -3)."
                : undefined
            }
            error={errors?.quantity?.[0]}
          >
            {(props) => (
              <Input
                {...props}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="numeric"
                autoFocus
              />
            )}
          </FormField>

          <FormField
            id="stock-reason"
            label="Raison"
            error={errors?.reason?.[0]}
          >
            {(props) => (
              <Select
                {...props}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="">Choisir…</option>
                {STOCK_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {STOCK_REASON_LABELS[value]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            id="stock-note"
            label="Note (facultatif)"
            error={errors?.note?.[0]}
          >
            {(props) => (
              <Input
                {...props}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={200}
              />
            )}
          </FormField>

          <p
            aria-live="polite"
            className={cn(
              "rounded-md bg-surface-muted px-3 py-2 text-sm",
              next !== null && next < 0 && "bg-danger/5 text-danger",
            )}
          >
            Stock après ajustement :{" "}
            <strong className="tabular-nums">
              {next === null ? "—" : next}
            </strong>
            {next !== null && next < 0 ? " (impossible)" : null}
          </p>

          {message ? (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Mettre à jour le stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
