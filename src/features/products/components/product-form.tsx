"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { slugify } from "@/lib/format";
import {
  createProductAction,
  type ProductField,
  type ProductFormState,
  updateProductAction,
} from "../actions";

export type ProductFormValues = Record<ProductField, string>;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border bg-surface p-5">
      {/* Floated so it sits inside the card rather than on its border. */}
      <legend className="float-left mb-4 w-full text-base font-semibold">
        {title}
      </legend>
      {/* clear-both: a grid next to a float would sit beside it and overflow. */}
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

export function ProductForm({
  mode,
  categories,
  initial,
  product,
}: {
  mode: "create" | "edit";
  categories: { id: string; label: string }[];
  initial: ProductFormValues;
  product?: { id: string; version: number; stock: number };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    mode === "create" ? createProductAction : updateProductAction,
    undefined,
  );
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  // The slug follows the name until the admin edits it by hand.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const saved = state?.ok === true;
  const values = state && !state.ok ? { ...initial, ...state.values } : initial;
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const error = (field: ProductField) => errors?.[field]?.[0];

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      router.push(`/admin/products/${state.id}`);
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  // Browser-level warning when leaving with unsaved changes.
  useEffect(() => {
    if (!dirty || saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saved]);

  const cancelHref = product
    ? `/admin/products/${product.id}`
    : "/admin/products";

  return (
    <form
      action={action}
      onChange={() => setDirty(true)}
      noValidate
      className="space-y-6"
    >
      {product ? (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="version" value={product.version} />
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Section title="Informations">
            <FormField id="name" label="Nom" error={error("name")}>
              {(props) => (
                <Input
                  {...props}
                  name="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(slugify(event.target.value));
                  }}
                  required
                  maxLength={120}
                />
              )}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="slug"
                label="Slug"
                hint="Utilisé dans l'adresse de la page produit."
                error={error("slug")}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(event.target.value);
                    }}
                    required
                    className="font-mono"
                  />
                )}
              </FormField>
              <FormField
                id="sku"
                label="SKU"
                hint="Référence unique : lettres, chiffres, tirets."
                error={error("sku")}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="sku"
                    defaultValue={values.sku}
                    required
                    className="font-mono uppercase"
                    autoCapitalize="characters"
                  />
                )}
              </FormField>
            </div>
            <FormField
              id="description"
              label="Description (facultatif)"
              error={error("description")}
            >
              {(props) => (
                <Textarea
                  {...props}
                  name="description"
                  defaultValue={values.description}
                  rows={5}
                  maxLength={5000}
                />
              )}
            </FormField>
          </Section>

          <Section title="Prix">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="price" label="Prix (€)" error={error("price")}>
                {(props) => (
                  <Input
                    {...props}
                    name="price"
                    defaultValue={values.price}
                    inputMode="decimal"
                    placeholder="24,99"
                    required
                  />
                )}
              </FormField>
              <FormField
                id="salePrice"
                label="Prix promo (€)"
                hint="Facultatif, inférieur au prix."
                error={error("salePrice")}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="salePrice"
                    defaultValue={values.salePrice}
                    inputMode="decimal"
                  />
                )}
              </FormField>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Publication">
            <FormField
              id="status"
              label="Statut"
              hint="Un brouillon n'apparaît pas dans la boutique."
              error={error("status")}
            >
              {(props) => (
                <Select
                  {...props}
                  name="status"
                  defaultValue={values.status}
                  options={[
                    { value: "DRAFT", label: "Brouillon" },
                    { value: "ACTIVE", label: "Actif" },
                  ]}
                />
              )}
            </FormField>
            <FormField
              id="categoryId"
              label="Catégorie"
              error={error("categoryId")}
            >
              {(props) => (
                <Select
                  {...props}
                  name="categoryId"
                  defaultValue={values.categoryId}
                  placeholder="Choisir…"
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.label,
                  }))}
                />
              )}
            </FormField>
          </Section>

          <Section title="Stock">
            {product ? (
              <p className="text-sm text-muted-foreground">
                Stock actuel :{" "}
                <strong className="text-foreground tabular-nums">
                  {product.stock}
                </strong>
                . Pour le modifier, utilisez « Ajuster le stock » sur la fiche :
                chaque changement est journalisé avec sa raison.
              </p>
            ) : (
              <FormField
                id="stock"
                label="Stock initial"
                error={error("stock")}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="stock"
                    defaultValue={values.stock}
                    inputMode="numeric"
                    required
                  />
                )}
              </FormField>
            )}
            <FormField
              id="lowStockThreshold"
              label="Seuil de stock faible"
              hint="En dessous ou à ce niveau, le produit est signalé."
              error={error("lowStockThreshold")}
            >
              {(props) => (
                <Input
                  {...props}
                  name="lowStockThreshold"
                  defaultValue={values.lowStockThreshold}
                  inputMode="numeric"
                  required
                />
              )}
            </FormField>
          </Section>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={pending || saved}>
          {pending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer le produit"
              : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}
