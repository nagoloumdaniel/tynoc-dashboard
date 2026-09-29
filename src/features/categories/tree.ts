import { type Category, isRoot } from "./types";

export type CategoryNode = Category & {
  /** Products directly in this category (non-archived). */
  ownProductCount: number;
  /** Own products plus those of the sub-categories. */
  productCount: number;
  children: CategoryNode[];
};

const bySortOrder = (a: Category, b: Category) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr");

export function buildCategoryTree(
  categories: Category[],
  counts: Record<string, number>,
): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const node = (category: Category): CategoryNode => ({
    ...category,
    ownProductCount: counts[category.id] ?? 0,
    productCount: counts[category.id] ?? 0,
    children: [],
  });

  // A child whose parent disappeared is shown at the top rather than lost.
  const roots = categories
    .filter((c) => isRoot(c) || !byId.has(c.parentId))
    .sort(bySortOrder)
    .map(node);
  const rootById = new Map(roots.map((r) => [r.id, r]));

  for (const child of categories.filter((c) => !isRoot(c)).sort(bySortOrder)) {
    const parent = rootById.get(child.parentId);
    if (!parent) continue;
    const childNode = node(child);
    parent.children.push(childNode);
    parent.productCount += childNode.ownProductCount;
  }
  return roots;
}

export type CategoryOption = { id: string; label: string };

/** Choices for a select, with "Parent › Child" labels. */
export function categoryOptions(
  tree: CategoryNode[],
  { usableOnly = true }: { usableOnly?: boolean } = {},
): CategoryOption[] {
  const options: CategoryOption[] = [];
  for (const root of tree) {
    if (usableOnly && !root.isActive) continue;
    options.push({ id: root.id, label: root.name });
    for (const child of root.children) {
      if (usableOnly && !child.isActive) continue;
      options.push({ id: child.id, label: `${root.name} › ${child.name}` });
    }
  }
  return options;
}

export function categoryLabels(tree: CategoryNode[]): Map<string, string> {
  return new Map(
    categoryOptions(tree, { usableOnly: false }).map((o) => [o.id, o.label]),
  );
}

/** A top-level category stands for itself and its sub-categories. */
export function expandCategory(tree: CategoryNode[], id: string): string[] {
  const root = tree.find((node) => node.id === id);
  return root ? [root.id, ...root.children.map((child) => child.id)] : [id];
}

export function isUsable(category: Category, parent: Category | null): boolean {
  if (!category.isActive) return false;
  return isRoot(category) || parent?.isActive === true;
}
