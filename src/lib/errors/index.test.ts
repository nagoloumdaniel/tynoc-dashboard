import { describe, expect, it } from "vitest";
import { AppError, conflict, notFound, toPublicError } from "./index";

describe("AppError helpers", () => {
  it("builds a 404 with a business code", () => {
    const error = notFound(
      "PRODUCT_NOT_FOUND",
      "Le produit demandé est introuvable.",
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(404);
    expect(error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("builds a 409 conflict", () => {
    expect(conflict("SKU_TAKEN", "Ce SKU est déjà utilisé.").status).toBe(409);
  });
});

describe("toPublicError", () => {
  it("exposes code and message of an AppError", () => {
    expect(
      toPublicError(notFound("PRODUCT_NOT_FOUND", "Introuvable.")),
    ).toEqual({
      status: 404,
      body: { code: "PRODUCT_NOT_FOUND", message: "Introuvable." },
    });
  });

  it("hides the details of unexpected errors", () => {
    const result = toPublicError(
      new Error("ResourceNotFoundException: table tynoc-Products"),
    );
    expect(result.status).toBe(500);
    expect(result.body.code).toBe("INTERNAL_ERROR");
    expect(result.body.message).not.toMatch(/tynoc|Exception/);
  });
});
