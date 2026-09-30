import {
  type BucketLocationConstraint,
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

export const IMAGES_PREFIX = "products/";

async function bucketExists(client: S3Client, bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw error;
  }
}

/**
 * Creates the images bucket if needed, then (re)applies its rules: anyone may
 * read `products/*`, nothing else is public, and browsers of `origins` may
 * POST uploads. Idempotent.
 */
export async function ensureBucket(
  client: S3Client,
  bucket: string,
  { region, aws, origins }: { region: string; aws: boolean; origins: string[] },
  log: (message: string) => void = console.log,
) {
  if (await bucketExists(client, bucket)) {
    log(`Bucket ${bucket} déjà présent`);
  } else {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
        ...(aws
          ? {
              CreateBucketConfiguration: {
                LocationConstraint: region as BucketLocationConstraint,
              },
            }
          : {}),
      }),
    );
    log(`Bucket ${bucket} créé`);
  }

  if (aws) {
    // New AWS buckets block public policies: allow this one, keep ACLs off.
    await client.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      }),
    );
  }
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadProductImages",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/${IMAGES_PREFIX}*`],
          },
        ],
      }),
    }),
  );
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["POST"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );
  log(
    `Règles du bucket ${bucket} appliquées (lecture publique ${IMAGES_PREFIX}*)`,
  );
}

/** Deletes every object of the bucket (test resets only). */
export async function emptyBucket(client: S3Client, bucket: string) {
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [o.Key] : []));
    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    }
    token = page.NextContinuationToken;
  } while (token);
}
