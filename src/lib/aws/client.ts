import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { awsCredentialsProvider } from "@vercel/functions/oidc";

export type DynamoClientOptions = {
  region: string;
  endpoint?: string;
  roleArn?: string;
};

// Shared by the app and the Node scripts, so it must not import server-only.
export function createDynamoClient({
  region,
  endpoint,
  roleArn,
}: DynamoClientOptions): DynamoDBClient {
  if (endpoint) {
    // DynamoDB Local accepts any credentials.
    return new DynamoDBClient({
      region,
      endpoint,
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
  }
  if (roleArn) {
    return new DynamoDBClient({
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    });
  }
  // Default AWS provider chain (e.g. the developer's AWS CLI profile).
  return new DynamoDBClient({ region });
}

/** Credentials of the local RustFS container (docker-compose.yml). */
export const LOCAL_S3_CREDENTIALS = {
  accessKeyId: "tynoc",
  secretAccessKey: "tynoc-local-secret",
};

export function createS3Client({
  region,
  endpoint,
  roleArn,
}: DynamoClientOptions): S3Client {
  if (endpoint) {
    // RustFS serves buckets by path, not by sub-domain.
    return new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: LOCAL_S3_CREDENTIALS,
    });
  }
  if (roleArn) {
    return new S3Client({
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    });
  }
  return new S3Client({ region });
}
