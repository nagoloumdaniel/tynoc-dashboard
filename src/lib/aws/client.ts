import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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
