import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("applies defaults when optional variables are missing", () => {
    expect(parseServerEnv({})).toEqual({
      AWS_REGION: "eu-west-3",
      DYNAMODB_ENDPOINT: undefined,
      DYNAMODB_TABLE_PREFIX: "tynoc-",
    });
  });

  it("treats an empty endpoint as undefined", () => {
    expect(
      parseServerEnv({ DYNAMODB_ENDPOINT: "" }).DYNAMODB_ENDPOINT,
    ).toBeUndefined();
  });

  it("keeps a valid local endpoint", () => {
    expect(
      parseServerEnv({ DYNAMODB_ENDPOINT: "http://localhost:8000" })
        .DYNAMODB_ENDPOINT,
    ).toBe("http://localhost:8000");
  });

  it("rejects an invalid endpoint with the variable name in the message", () => {
    expect(() => parseServerEnv({ DYNAMODB_ENDPOINT: "not-a-url" })).toThrow(
      /DYNAMODB_ENDPOINT/,
    );
  });

  it("rejects a table prefix with characters DynamoDB does not allow", () => {
    expect(() =>
      parseServerEnv({ DYNAMODB_TABLE_PREFIX: "bad prefix!" }),
    ).toThrow(/DYNAMODB_TABLE_PREFIX/);
  });
});
