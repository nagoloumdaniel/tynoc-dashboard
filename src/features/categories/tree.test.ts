import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  categoryLabels,
  categoryOptions,
  expandCategory,
  isUsable,
} from "./tree";
import { type Category, ROOT_PARENT } from "./types";

function category(id: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    name: id,
    slug: id,
    parentId: ROOT_PARENT,
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    ...overrides,
  };
}

const categories = [
  category("deco", { name: "Décoration", sortOrder: 20 }),
  category("mobilier", { name: "Mobilier", sortOrder: 10 }),
  category("chaises", { name: "Chaises", parentId: "mobilier", sortOrder: 2 }),
  category("tables", { name: "Tables", parentId: "mobilier", sortOrder: 1 }),
  category("vieux", {
    name: "Vieux",
    parentId: "mobilier",
    sortOrder: 3,
    isActive: false,
  }),
  category("off", { name: "Soldes", sortOrder: 30, isActive: false }),
  category("off-child", { name: "Fin de série", parentId: "off" }),
];

const counts = { mobilier: 2, chaises: 5, tables: 1, deco: 4 };

describe("buildCategoryTree", () => {
  const tree = buildCategoryTree(categories, counts);

  it("orders top-level categories and their children by sort order", () => {
    expect(tree.map((node) => node.id)).toEqual(["mobilier", "deco", "off"]);
    expect(tree[0]?.children.map((node) => node.id)).toEqual([
      "tables",
      "chaises",
      "vieux",
    ]);
  });

  it("adds children's products to their parent's total", () => {
    expect(tree[0]).toMatchObject({ ownProductCount: 2, productCount: 8 });
    expect(tree[0]?.children[1]).toMatchObject({
      ownProductCount: 5,
      productCount: 5,
    });
    expect(tree[2]).toMatchObject({ productCount: 0 });
  });

  it("keeps a child whose parent is missing as a top-level category", () => {
    const orphanTree = buildCategoryTree(
      [category("lost", { parentId: "gone" })],
      {},
    );
    expect(orphanTree.map((node) => node.id)).toEqual(["lost"]);
  });
});

describe("categoryOptions", () => {
  it("lists usable categories with their full name", () => {
    expect(categoryOptions(buildCategoryTree(categories, counts))).toEqual([
      { id: "mobilier", label: "Mobilier" },
      { id: "tables", label: "Mobilier › Tables" },
      { id: "chaises", label: "Mobilier › Chaises" },
      { id: "deco", label: "Décoration" },
    ]);
  });

  it("can include inactive categories for filters", () => {
    const ids = categoryOptions(buildCategoryTree(categories, counts), {
      usableOnly: false,
    }).map((option) => option.id);
    expect(ids).toContain("vieux");
    expect(ids).toContain("off-child");
  });
});

describe("categoryLabels", () => {
  it("names every category, inactive ones included", () => {
    const labels = categoryLabels(buildCategoryTree(categories, counts));
    expect(labels.get("vieux")).toBe("Mobilier › Vieux");
    expect(labels.get("off")).toBe("Soldes");
  });
});

describe("expandCategory", () => {
  const tree = buildCategoryTree(categories, counts);

  it("includes the children of a top-level category", () => {
    expect(expandCategory(tree, "mobilier")).toEqual([
      "mobilier",
      "tables",
      "chaises",
      "vieux",
    ]);
  });

  it("returns a sub-category alone", () => {
    expect(expandCategory(tree, "chaises")).toEqual(["chaises"]);
  });
});

describe("isUsable", () => {
  it("requires the category and its parent to be active", () => {
    const parent = category("p");
    expect(isUsable(category("c", { parentId: "p" }), parent)).toBe(true);
    expect(
      isUsable(category("c", { parentId: "p" }), {
        ...parent,
        isActive: false,
      }),
    ).toBe(false);
    expect(isUsable(category("c", { parentId: "p" }), null)).toBe(false);
    expect(isUsable(category("r", { isActive: false }), null)).toBe(false);
    expect(isUsable(category("r"), null)).toBe(true);
  });
});
