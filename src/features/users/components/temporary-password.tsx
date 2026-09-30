"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Shown once: the password is stored only as a hash. */
export function TemporaryPassword({
  name,
  password,
  onDone,
}: {
  name: string;
  password: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm">
        Transmettez ce mot de passe temporaire à <strong>{name}</strong> par un
        canal sûr. Il devra le remplacer à sa première connexion.
      </p>
      <div className="flex items-center gap-2 rounded-md border bg-surface-muted p-3">
        <code
          aria-label="Mot de passe temporaire"
          className="flex-1 font-mono text-base tracking-wide break-all select-all"
        >
          {password}
        </code>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
      <p
        role="status"
        className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning"
      >
        Il ne sera plus affiché après la fermeture de cette fenêtre.
      </p>
      <div className="flex justify-end">
        <Button onClick={onDone}>J&apos;ai transmis le mot de passe</Button>
      </div>
    </div>
  );
}
