"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

// Radix reserves "" for "nothing selected" (the placeholder shows), while
// filters use "" as a real option ("all"): that option travels as EMPTY.
const EMPTY = "__empty__";
const decode = (value: string) => (value === EMPTY ? "" : value);

/**
 * Styled listbox replacing the native <select>. In forms, pass `name` and
 * use `placeholder` rather than an empty option: nothing chosen submits "".
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  // Always controlled, so the chosen label is known during the server render.
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const label = options.find((option) => option.value === current)?.label;
  const hasEmptyOption = options.some((option) => option.value === "");

  return (
    <SelectPrimitive.Root
      value={current === "" && hasEmptyOption ? EMPTY : current}
      onValueChange={(next) => {
        setInner(decode(next));
        onValueChange?.(decode(next));
      }}
      name={name}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left text-sm shadow-xs transition-colors",
          "hover:border-primary/40 data-[placeholder]:text-muted-foreground data-[state=open]:border-primary/60",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-invalid:border-danger",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          {/* Radix fills the value only after hydration: the empty-then-filled
              trigger made the layout jump. The label is rendered here instead. */}
          <SelectPrimitive.Value placeholder={placeholder}>
            {label}
          </SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border bg-surface text-foreground shadow-lg",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none",
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUpIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value === "" ? EMPTY : option.value}
                className="relative flex cursor-default items-center rounded-md py-2 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted data-[state=checked]:font-medium"
              >
                <span className="absolute left-2 grid size-4 place-items-center text-primary">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDownIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
