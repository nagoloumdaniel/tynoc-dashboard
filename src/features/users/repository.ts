import "server-only";
import { randomUUID } from "node:crypto";
import {
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import { failedTransactionItems } from "@/lib/aws/errors";
import { conflict } from "@/lib/errors";
import type { UserRecord, UserRole, UserStatus } from "./types";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const emailKey = (email: string) => `EMAIL#${normalizeEmail(email)}`;

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Users"),
      Key: { id },
      ConsistentRead: true,
    }),
  );
  return (Item as UserRecord | undefined) ?? null;
}

// Goes through the uniqueness guard: strongly consistent, unlike a GSI query.
export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Uniques"),
      Key: { pk: emailKey(email) },
      ConsistentRead: true,
    }),
  );
  return Item ? findUserById(Item.userId as string) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  passwordHash?: string;
}): Promise<UserRecord> {
  const now = new Date().toISOString();
  const user: UserRecord = {
    id: `usr_${randomUUID()}`,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    role: input.role,
    status: input.status ?? "ACTIVE",
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  try {
    await db().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: table("Users"),
              Item: user,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Put: {
              TableName: table("Uniques"),
              Item: { pk: emailKey(user.email), userId: user.id },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Update: {
              TableName: table("Stats"),
              Key: { pk: "GLOBAL" },
              UpdateExpression: "ADD totalUsers :one",
              ExpressionAttributeValues: { ":one": 1 },
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (failedTransactionItems(error).includes(1)) {
      throw conflict("EMAIL_TAKEN", "Cet email est déjà utilisé.");
    }
    throw error;
  }
  return user;
}

export async function setPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Users"),
      Key: { id: userId },
      UpdateExpression:
        "SET passwordHash = :hash, updatedAt = :now ADD version :one",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: {
        ":hash": passwordHash,
        ":now": new Date().toISOString(),
        ":one": 1,
      },
    }),
  );
}

export async function markLogin(userId: string, at: string): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Users"),
      Key: { id: userId },
      UpdateExpression: "SET lastLoginAt = :at",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: { ":at": at },
    }),
  );
}
