import { createCategory } from "../../src/features/categories/service";
import {
  ROOT_PARENT,
  SEED_CATEGORIES,
} from "../../src/features/categories/types";
import { findCategory } from "../../src/features/categories/repository";

export const SEED_ACTOR = {
  userId: "system",
  email: "seed@tynoc.local",
  name: "Seed",
  role: "SUPER_ADMIN",
} as const;

/**
 * Starter categories with stable ids (cat_<slug>), which the demo products
 * reference. Existing ones are skipped, so it can run again safely.
 */
export async function seedCategories(log: (message: string) => void) {
  for (const [index, seed] of SEED_CATEGORIES.entries()) {
    const id = `cat_${seed.slug}`;
    if (await findCategory(id)) {
      log(`= Catégorie ${seed.name} (existe déjà)`);
      continue;
    }
    await createCategory(
      SEED_ACTOR,
      {
        ...seed,
        description: undefined,
        parentId: ROOT_PARENT,
        sortOrder: (index + 1) * 10,
        isActive: true,
      },
      { id },
    );
    log(`+ Catégorie ${seed.name}`);
  }
}
