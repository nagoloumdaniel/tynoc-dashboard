import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { TEST_CART_PRODUCTS, TEST_USERS } from "../tests/e2e/test-users";
import { createProduct } from "../src/features/products/service";
import { createUser } from "../src/features/users/repository";
import { createDynamoClient, createS3Client } from "../src/lib/aws/client";
import { db, table } from "../src/lib/aws/dynamodb";
import { hashPassword } from "../src/lib/auth/password";
import { slugify } from "../src/lib/format";
import { run } from "./lib/cli";
import { emptyBucket, ensureBucket } from "./lib/ensure-bucket";
import { dropTables, ensureTables } from "./lib/ensure-tables";
import { SEED_ACTOR, seedCategories } from "./lib/seed-categories";

const TEST_ENDPOINT = "http://localhost:8000";
const TEST_PREFIX = "tynoc-test-";
const TEST_S3_ENDPOINT = "http://localhost:9000";
const TEST_BUCKET = "tynoc-test-images";

// Recreates the test tables from scratch so every E2E run starts clean
// (sessions, rate-limit counters and users included), then adds test accounts.
run(async () => {
  process.env.DYNAMODB_ENDPOINT = TEST_ENDPOINT;
  process.env.DYNAMODB_TABLE_PREFIX = TEST_PREFIX;
  process.env.S3_ENDPOINT = TEST_S3_ENDPOINT;
  process.env.S3_BUCKET = TEST_BUCKET;

  const client = createDynamoClient({
    region: "eu-west-3",
    endpoint: TEST_ENDPOINT,
  });
  await dropTables(client, TEST_PREFIX);
  await ensureTables(client, TEST_PREFIX, () => {});

  const s3 = createS3Client({
    region: "eu-west-3",
    endpoint: TEST_S3_ENDPOINT,
  });
  await ensureBucket(
    s3,
    TEST_BUCKET,
    { region: "eu-west-3", aws: false, origins: ["*"] },
    () => {},
  );
  await emptyBucket(s3, TEST_BUCKET);

  await seedCategories(() => {});

  const userIds: Record<string, string> = {};
  for (const [key, user] of Object.entries(TEST_USERS)) {
    userIds[key] = (
      await createUser({
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: await hashPassword(user.password),
      })
    ).id;
  }

  const products = [];
  for (const item of TEST_CART_PRODUCTS) {
    products.push(
      await createProduct(SEED_ACTOR, {
        ...item,
        slug: slugify(item.name),
        description: undefined,
        categoryId: "cat_cuisine",
        salePriceInCents: undefined,
        lowStockThreshold: 1,
        status: "ACTIVE",
      }),
    );
  }

  // Lines written as the shop would, with `feed` for the list index.
  const now = new Date().toISOString();
  const put = (
    tableKey: "Carts" | "Wishlists",
    item: Record<string, unknown>,
  ) => db().send(new PutCommand({ TableName: table(tableKey), Item: item }));
  for (const [index, product] of products.entries()) {
    await put("Carts", {
      userId: userIds.cartOwner,
      productId: product.id,
      quantity: index + 1,
      addedAt: now,
      updatedAt: now,
      feed: "CART",
    });
    await put("Wishlists", {
      userId: userIds.cartOwner,
      productId: product.id,
      addedAt: now,
      feed: "WISHLIST",
    });
  }
  // A cart nobody modifies, for the read-only checks.
  await put("Carts", {
    userId: userIds.customer,
    productId: products[0]!.id,
    quantity: 1,
    addedAt: now,
    updatedAt: now,
    feed: "CART",
  });

  console.log(
    `Base de test réinitialisée (${TEST_PREFIX}*, ${Object.keys(TEST_USERS).length} comptes)`,
  );
});
