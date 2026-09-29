import { describe, expect, it } from "vitest";
import { failedTransactionItems, isConditionFailure } from "./errors";

function awsError(name: string, extra: object = {}) {
  return Object.assign(new Error(name), { name }, extra);
}

describe("isConditionFailure", () => {
  it("detects a failed condition", () => {
    expect(
      isConditionFailure(awsError("ConditionalCheckFailedException")),
    ).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isConditionFailure(awsError("ResourceNotFoundException"))).toBe(
      false,
    );
    expect(isConditionFailure("oops")).toBe(false);
  });
});

describe("failedTransactionItems", () => {
  it("returns the indexes whose condition failed", () => {
    const error = awsError("TransactionCanceledException", {
      CancellationReasons: [
        { Code: "None" },
        { Code: "ConditionalCheckFailed" },
        { Code: "None" },
      ],
    });
    expect(failedTransactionItems(error)).toEqual([1]);
  });

  it("returns an empty list for any other error", () => {
    expect(failedTransactionItems(new Error("boom"))).toEqual([]);
  });
});
