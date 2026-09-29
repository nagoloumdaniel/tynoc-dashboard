import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  createCategory,
  findCategory,
} from "../src/features/categories/repository";
import { SEED_CATEGORIES } from "../src/features/categories/types";
import { db, table } from "../src/lib/aws/dynamodb";
import { isConditionFailure } from "../src/lib/aws/errors";
import { prepareTarget, run } from "./lib/cli";

// pnpm db:seed            → stats + starter categories (DynamoDB Local)
// pnpm db:seed -- --aws   → same on AWS
// Idempotent: existing items are left untouched.
run(async () => {
  prepareTarget();

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
});
