import { describe, expect, it } from "vitest";
import { dummyHash, hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await verifyPassword("wrong", await hashPassword("right"))).toBe(
      false,
    );
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("treats visually identical unicode passwords as equal", async () => {
    // "é" precomposed vs "e" + combining accent
    const hash = await hashPassword("café-secret");
    expect(await verifyPassword("café-secret", hash)).toBe(true);
  });

  it.each([
    "",
    "bcrypt$x",
    "scrypt$abc$8$1$AA$AA",
    "scrypt$32768$8$1$$",
    "scrypt$33000$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA",
    "scrypt$2097152$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA",
  ])("returns false for the malformed hash %j", async (stored) => {
    expect(await verifyPassword("x", stored)).toBe(false);
  });

  it("provides a stable dummy hash that never matches a real password", async () => {
    const first = await dummyHash();
    expect(await dummyHash()).toBe(first);
    expect(await verifyPassword("", first)).toBe(false);
  });
});
