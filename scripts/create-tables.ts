import { createDynamoClient } from "../src/lib/aws/client";
import { getServerEnv } from "../src/lib/env";
import { prepareTarget, run } from "./lib/cli";
import { ensureTables } from "./lib/ensure-tables";

// pnpm db:create            → DynamoDB Local (DYNAMODB_ENDPOINT)
// pnpm db:create -- --aws   → AWS, with the local AWS CLI credentials
run(async () => {
  const target = prepareTarget();
  const env = getServerEnv();
  console.log(
    `Cible : ${target === "aws" ? `AWS (${env.AWS_REGION})` : env.DYNAMODB_ENDPOINT}`,
  );

  const client = createDynamoClient({
    region: env.AWS_REGION,
    endpoint: env.DYNAMODB_ENDPOINT,
  });
  await ensureTables(client, env.DYNAMODB_TABLE_PREFIX);
});
