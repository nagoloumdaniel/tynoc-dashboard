// Compare by name: instanceof breaks if two copies of the SDK are installed.
export function isConditionFailure(error: unknown): boolean {
  return (
    error instanceof Error && error.name === "ConditionalCheckFailedException"
  );
}

/**
 * Index of the operations whose condition failed in a cancelled transaction,
 * e.g. [1] when the second item (a uniqueness guard) already existed.
 */
export function failedTransactionItems(error: unknown): number[] {
  if (
    !(error instanceof Error) ||
    error.name !== "TransactionCanceledException"
  )
    return [];
  const reasons = (
    error as Error & { CancellationReasons?: { Code?: string }[] }
  ).CancellationReasons;
  return (reasons ?? []).flatMap((reason, index) =>
    reason.Code === "ConditionalCheckFailed" ? [index] : [],
  );
}
