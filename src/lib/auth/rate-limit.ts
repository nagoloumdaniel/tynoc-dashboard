import "server-only";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import { isConditionFailure } from "@/lib/aws/errors";
import { nowInSeconds } from "./session-policy";

export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_WINDOW_S = 15 * 60;

const emailKey = (email: string) => `LOGIN#EMAIL#${email}`;
const ipKey = (ip: string) => `LOGIN#IP#${ip}`;

async function isBlocked(pk: string, now: number): Promise<boolean> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("RateLimits"),
      Key: { pk },
      ConsistentRead: true,
    }),
  );
  // An expired window may linger until DynamoDB's TTL purge: ignore it.
  return (
    !!Item &&
    (Item.expiresAt as number) > now &&
    (Item.count as number) >= MAX_LOGIN_FAILURES
  );
}

export async function checkLoginAllowed(
  email: string,
  ip: string,
): Promise<boolean> {
  const now = nowInSeconds();
  const [emailBlocked, ipBlocked] = await Promise.all([
    isBlocked(emailKey(email), now),
    isBlocked(ipKey(ip), now),
  ]);
  return !emailBlocked && !ipBlocked;
}

/** Returns the failures counted in the current window, this one included. */
async function increment(pk: string, now: number): Promise<number> {
  const windowEnd = now + LOGIN_WINDOW_S;
  try {
    // Fixed window: the first failure sets the end, later ones only count.
    const { Attributes } = await db().send(
      new UpdateCommand({
        TableName: table("RateLimits"),
        Key: { pk },
        UpdateExpression:
          "ADD #count :one SET expiresAt = if_not_exists(expiresAt, :windowEnd)",
        ConditionExpression: "attribute_not_exists(pk) OR expiresAt > :now",
        ExpressionAttributeNames: { "#count": "count" },
        ExpressionAttributeValues: {
          ":one": 1,
          ":windowEnd": windowEnd,
          ":now": now,
        },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    return Number(Attributes?.count ?? 1);
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
    // The previous window has ended: start a new one.
    await db().send(
      new PutCommand({
        TableName: table("RateLimits"),
        Item: { pk, count: 1, expiresAt: windowEnd },
      }),
    );
    return 1;
  }
}

/**
 * Counts a failure for the email and the IP. `emailBlocked` is true only for
 * the failure that blocks the email, so the caller can report it once.
 */
export async function recordLoginFailure(
  email: string,
  ip: string,
): Promise<{ emailBlocked: boolean }> {
  const now = nowInSeconds();
  const [emailFailures] = await Promise.all([
    increment(emailKey(email), now),
    increment(ipKey(ip), now),
  ]);
  return { emailBlocked: emailFailures === MAX_LOGIN_FAILURES };
}

export async function clearLoginFailures(email: string): Promise<void> {
  await db().send(
    new DeleteCommand({
      TableName: table("RateLimits"),
      Key: { pk: emailKey(email) },
    }),
  );
}
