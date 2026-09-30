import "server-only";
import type { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/env";
import { createS3Client } from "./client";
import { s3PublicBaseUrl } from "./s3-public-url";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

export function s3(): S3Client {
  if (!globalForS3.s3) {
    const env = getServerEnv();
    globalForS3.s3 = createS3Client({
      region: env.AWS_REGION,
      endpoint: env.S3_ENDPOINT,
      roleArn: env.AWS_ROLE_ARN,
    });
  }
  return globalForS3.s3;
}

/** The images bucket, or null when image storage is not configured. */
export function imageStorage(): { bucket: string; publicUrl: string } | null {
  const env = getServerEnv();
  if (!env.S3_BUCKET) return null;
  return {
    bucket: env.S3_BUCKET,
    publicUrl: s3PublicBaseUrl({
      bucket: env.S3_BUCKET,
      region: env.AWS_REGION,
      endpoint: env.S3_ENDPOINT,
      publicUrl: env.S3_PUBLIC_URL,
    }),
  };
}
