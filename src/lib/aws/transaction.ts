import "server-only";
import {
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { db } from "./dynamodb";
import { failedTransactionItems } from "./errors";

export type TransactItem = NonNullable<
  TransactWriteCommandInput["TransactItems"]
>[number];

/** A transaction operation labelled so a failed condition can be explained. */
export type TaggedItem = { tag: string; item: TransactItem };

export class TransactionConditionError extends Error {
  constructor(public readonly failedTags: string[]) {
    super(`Transaction condition failed: ${failedTags.join(", ")}`);
    this.name = "TransactionConditionError";
  }
}

/**
 * All-or-nothing write. When a condition fails, throws a
 * TransactionConditionError listing the tags of the failing operations.
 */
export async function transact(items: TaggedItem[]): Promise<void> {
  try {
    await db().send(
      new TransactWriteCommand({
        TransactItems: items.map(({ item }) => item),
      }),
    );
  } catch (error) {
    const failed = failedTransactionItems(error);
    if (failed.length === 0) throw error;
    throw new TransactionConditionError(
      failed.map((index) => items[index]?.tag ?? `#${index}`),
    );
  }
}
