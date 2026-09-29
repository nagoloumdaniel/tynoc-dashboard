import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  createCategory,
  findCategory,
} from "../src/features/categories/repository";
import { SEED_CATEGORIES } from "../src/features/categories/types";
import {
  archiveProduct,
  createProduct,
} from "../src/features/products/service";
import { AppError } from "../src/lib/errors";
import { db, table } from "../src/lib/aws/dynamodb";
import { isConditionFailure } from "../src/lib/aws/errors";
import { hasFlag, prepareTarget, run } from "./lib/cli";
import { DEMO_PRODUCTS } from "./lib/demo-products";

const SEED_ACTOR = {
  userId: "system",
  email: "seed@tynoc.local",
  name: "Seed",
  role: "SUPER_ADMIN",
} as const;

// pnpm db:seed             → stats + starter categories (DynamoDB Local)
// pnpm db:seed -- --aws    → same on AWS
// pnpm db:seed -- --demo   → + ~40 demo products (local only)
// Idempotent: existing items are left untouched.
run(async () => {
  const target = prepareTarget();
  const demo = hasFlag("demo");
  // Checked before any write: a refused command must not change anything.
  if (demo && target === "aws") {
    throw new Error("Les produits de démonstration sont réservés au local.");
  }

  try {
    await db().send(
      new PutCommand({
        TableName: table("Stats"),
        Item: {
          pk: "GLOBAL",
          totalUsers: 0,
          totalProducts: 0,
          totalCategories: 0,
          cartItems: 0,
          wishlistItems: 0,
          outOfStock: 0,
          lowStock: 0,
          updatedAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    console.log("+ Stats#GLOBAL");
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
    console.log("= Stats#GLOBAL (existe déjà)");
  }

  for (const [index, seed] of SEED_CATEGORIES.entries()) {
    if (await findCategory(`cat_${seed.slug}`)) {
      console.log(`= Catégorie ${seed.name} (existe déjà)`);
      continue;
    }
    await createCategory({ ...seed, sortOrder: (index + 1) * 10 });
    console.log(`+ Catégorie ${seed.name}`);
  }

  if (demo) {
    let created = 0;
    for (const { input, archived } of DEMO_PRODUCTS) {
      try {
        const product = await createProduct(SEED_ACTOR, input);
        if (archived)
          await archiveProduct(SEED_ACTOR, product.id, product.version);
        created++;
      } catch (error) {
        if (!(error instanceof AppError && error.code === "SKU_TAKEN"))
          throw error;
      }
    }
    console.log(
      `+ ${created} produit(s) de démonstration (${DEMO_PRODUCTS.length - created} déjà présents)`,
    );
  }
});
