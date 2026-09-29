import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "../src/lib/aws/dynamodb";
import { isConditionFailure } from "../src/lib/aws/errors";
import { prepareTarget, run } from "./lib/cli";

// Creates the global stats item read by the dashboard, without resetting
// counters that already exist. Entity fixtures come with their modules.
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
});
