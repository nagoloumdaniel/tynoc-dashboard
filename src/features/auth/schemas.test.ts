import { describe, expect, it } from "vitest";
import { loginSchema } from "./schemas";

describe("loginSchema", () => {
  it("accepts and trims a valid email", () => {
    expect(
      loginSchema.parse({ email: "  admin@tynoc.fr ", password: "secret" }),
    ).toEqual({ email: "admin@tynoc.fr", password: "secret" });
  });

  it("rejects an invalid email with a French message", () => {
    const result = loginSchema.safeParse({ email: "nope", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Saisissez une adresse email valide.",
    );
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.fr", password: "" });
    expect(result.error?.issues[0]?.message).toBe(
      "Saisissez votre mot de passe.",
    );
  });

  it("rejects a missing field", () => {
    expect(loginSchema.safeParse({ email: null, password: null }).success).toBe(
      false,
    );
  });
});
