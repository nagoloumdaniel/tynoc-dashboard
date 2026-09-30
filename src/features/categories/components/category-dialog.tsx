"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { slugify } from "@/lib/format";
import {
  type CategoryField,
  type CategoryFormState,
  createCategoryAction,
  updateCategoryAction,
} from "../actions";
import { ROOT_PARENT } from "../types";

export type EditableCategory = {
  id: string;
  version: number;
  name: string;
  slug: string;
  description?: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  hasChildren: boolean;
};

function CategoryForm({
  category,
  parents,
  onSaved,
}: {
  category?: EditableCategory;
  parents: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(
    category ? updateCategoryAction : createCategoryAction,
    undefined,
  );
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  const values = state && !state.ok ? state.values : undefined;
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const error = (field: CategoryField) => errors?.[field]?.[0];

  // onSaved changes on every render; it must not re-trigger the effect.
  const handleSaved = useEffectEvent(onSaved);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      handleSaved();
    }
  }, [state]);

  const selectableParents = parents.filter((p) => p.id !== category?.id);

  return (
    <form action={action} className="mt-5 space-y-4" noValidate>
      {category ? (
        <>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="version" value={category.version} />
        </>
      ) : null}

      <FormField id="category-name" label="Nom" error={error("name")}>
        {(props) => (
          <Input
            {...props}
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            maxLength={60}
            autoFocus
          />
        )}
      </FormField>

      <FormField id="category-slug" label="Slug" error={error("slug")}>
        {(props) => (
          <Input
            {...props}
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className="font-mono"
          />
        )}
      </FormField>

      <FormField
        id="category-parent"
        label="Catégorie parente"
        hint={
          category?.hasChildren
            ? "Elle a des sous-catégories : elle reste une catégorie principale."
            : undefined
        }
        error={error("parentId")}
      >
        {(props) => (
          <Select
            {...props}
            name="parentId"
            defaultValue={values?.parentId ?? category?.parentId ?? ROOT_PARENT}
            disabled={category?.hasChildren}
          >
            <option value={ROOT_PARENT}>Aucune (catégorie principale)</option>
            {selectableParents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {/* A disabled select is not submitted: keep the current parent. */}
      {category?.hasChildren ? (
        <input type="hidden" name="parentId" value={ROOT_PARENT} />
      ) : null}

      <FormField
        id="category-description"
        label="Description (facultatif)"
        error={error("description")}
      >
        {(props) => (
          <Textarea
            {...props}
            name="description"
            defaultValue={values?.description ?? category?.description ?? ""}
            rows={3}
            maxLength={500}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="category-order"
          label="Ordre d'affichage"
          hint="Les plus petits en premier."
          error={error("sortOrder")}
        >
          {(props) => (
            <Input
              {...props}
              name="sortOrder"
              defaultValue={
                values?.sortOrder ?? String(category?.sortOrder ?? 100)
              }
              inputMode="numeric"
            />
          )}
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={
              values ? values.isActive === "on" : (category?.isActive ?? true)
            }
            className="size-4 accent-primary"
          />
          Active
        </label>
      </div>

      {state && !state.ok && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Enregistrement…"
            : category
              ? "Enregistrer"
              : "Créer la catégorie"}
        </Button>
      </div>
    </form>
  );
}

export function CategoryDialog({
  trigger,
  category,
  parents,
}: {
  trigger: React.ReactNode;
  category?: EditableCategory;
  parents: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  // New key on every opening: the form starts from a clean state.
  const [session, setSession] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setSession((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {category ? `Modifier « ${category.name} »` : "Nouvelle catégorie"}
        </DialogTitle>
        <DialogDescription>
          Un seul niveau de sous-catégories : une sous-catégorie ne peut pas en
          contenir d&apos;autres.
        </DialogDescription>
        <CategoryForm
          key={session}
          category={category}
          parents={parents}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
