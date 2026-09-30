import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "./temp-password";

describe("generateTemporaryPassword", () => {
  it("makes 16 characters without look-alike letters or digits", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(16);
      expect(password).not.toMatch(/[0O1lI]/);
      expect(password).toMatch(/^[A-Za-z2-9]+$/);
    }
  });

  it("is different every time", () => {
    const passwords = new Set(
      Array.from({ length: 100 }, () => generateTemporaryPassword()),
    );
    expect(passwords.size).toBe(100);
  });
});
