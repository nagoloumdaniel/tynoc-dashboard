"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Password field with an eye button to show what was typed. */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Shown passwords must not be corrected or capitalised.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        {visible ? (
          <EyeOffIcon className="size-4" aria-hidden />
        ) : (
          <EyeIcon className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
