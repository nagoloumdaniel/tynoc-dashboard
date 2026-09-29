import { describe, expect, it } from "vitest";
import { generateSessionToken, hashToken } from "./tokens";

describe("session tokens", () => {
  it("generates distinct 256-bit url-safe tokens", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSessionToken()).not.toBe(token);
  });

  it("hashes a token deterministically to 64 hex characters", () => {
    const token = generateSessionToken();
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(generateSessionToken()));
  });
});
