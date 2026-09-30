import { createDynamoClient, createS3Client } from "../src/lib/aws/client";
import { getServerEnv } from "../src/lib/env";
import { getArg, prepareTarget, run } from "./lib/cli";
import { ensureBucket } from "./lib/ensure-bucket";
import { ensureTables } from "./lib/ensure-tables";

const PRODUCTION_ORIGIN = "https://tynoc-dashboard.vercel.app";

// pnpm db:create            → DynamoDB Local (DYNAMODB_ENDPOINT) + RustFS
// pnpm db:create -- --aws   → AWS, with the local AWS CLI credentials
//   --bucket <name>         → also create the images bucket (AWS only)
//   --origin <url>          → site allowed to upload images (AWS only)
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

  // On AWS the bucket is named explicitly: .env.local holds the local one.
  const bucket = target === "aws" ? getArg("bucket") : env.S3_BUCKET;
  if (!bucket) {
    console.log(
      target === "aws"
        ? "Bucket d'images ignoré (passez --bucket <nom> pour le créer)."
        : "S3_BUCKET non défini : bucket d'images ignoré.",
    );
    return;
  }
  await ensureBucket(
    createS3Client({ region: env.AWS_REGION, endpoint: env.S3_ENDPOINT }),
    bucket,
    {
      region: env.AWS_REGION,
      aws: target === "aws",
      origins:
        target === "aws" ? [getArg("origin") ?? PRODUCTION_ORIGIN] : ["*"],
    },
  );
});
