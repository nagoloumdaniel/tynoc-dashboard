import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createCategory,
  findCategory,
  listActiveCategories,
} from "./repository";

const slug = () => `test-${randomUUID().slice(0, 8)}`;

describe("category repository", () => {
  it("creates a category found by id", async () => {
    const created = await createCategory({
      name: "Jardin",
      slug: slug(),
      sortOrder: 1,
    });
    expect(created.id).toBe(`cat_${created.slug}`);
    expect(await findCategory(created.id)).toEqual(created);
  });

  it("returns null for an unknown category", async () => {
    expect(await findCategory("cat_unknown-category")).toBeNull();
  });

  it("lists active top-level categories by sort order", async () => {
    const second = await createCategory({
      name: "B",
      slug: slug(),
      sortOrder: 902,
    });
    const first = await createCategory({
      name: "A",
      slug: slug(),
      sortOrder: 901,
    });
    const hidden = await createCategory({
      name: "C",
      slug: slug(),
      sortOrder: 903,
      isActive: false,
    });

    const ids = (await listActiveCategories()).map((category) => category.id);
    expect(ids).toContain(first.id);
    expect(ids).not.toContain(hidden.id);
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
  });

  it("refuses a duplicate slug", async () => {
    const value = slug();
    await createCategory({ name: "A", slug: value, sortOrder: 1 });
    await expect(
      createCategory({ name: "B", slug: value, sortOrder: 2 }),
    ).rejects.toMatchObject({ code: "CATEGORY_SLUG_TAKEN", status: 409 });
  });
});
