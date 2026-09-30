import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  archiveProduct,
  createProduct,
} from "../src/features/products/service";
import { createUser } from "../src/features/users/repository";
import { AppError } from "../src/lib/errors";
import { db, table } from "../src/lib/aws/dynamodb";
import { isConditionFailure } from "../src/lib/aws/errors";
import { hasFlag, prepareTarget, run } from "./lib/cli";
import { seedDemoCarts } from "./lib/demo-carts";
import { DEMO_CUSTOMERS } from "./lib/demo-customers";
import { DEMO_PRODUCTS } from "./lib/demo-products";
import { SEED_ACTOR, seedCategories } from "./lib/seed-categories";

// pnpm db:seed             → stats + starter categories (DynamoDB Local)
// pnpm db:seed -- --aws    → same on AWS
// pnpm db:seed -- --demo   → + demo products, customers, carts, wishlists
// On AWS, --demo also needs --allow-demo-in-production: the public demo
// shows fictitious data, never real customers.
// Idempotent: existing items are left untouched.
const DAY = 86_400_000;

run(async () => {
  const target = prepareTarget();
  const demo = hasFlag("demo");
  // Checked before any write: a refused command must not change anything.
  if (demo && target === "aws" && !hasFlag("allow-demo-in-production")) {
    throw new Error(
      "Données de démonstration sur AWS : ajoutez --allow-demo-in-production pour confirmer.",
    );
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

  await seedCategories(console.log);

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

    let customers = 0;
    for (const [index, customer] of DEMO_CUSTOMERS.entries()) {
      try {
        await createUser({
          ...customer,
          role: "CUSTOMER",
          // One sign-up every three days: the dashboard charts have a shape.
          createdAt: new Date(Date.now() - index * 3 * DAY).toISOString(),
        });
        customers++;
      } catch (error) {
        if (!(error instanceof AppError && error.code === "EMAIL_TAKEN"))
          throw error;
      }
    }
    console.log(
      `+ ${customers} client(s) de démonstration (${DEMO_CUSTOMERS.length - customers} déjà présents)`,
    );

    const carts = await seedDemoCarts();
    console.log(
      `+ ${carts.cartLines} ligne(s) de panier, ${carts.wishlistLines} ligne(s) de wishlist`,
    );
  }
});
