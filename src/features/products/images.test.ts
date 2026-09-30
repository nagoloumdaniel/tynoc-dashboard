import { describe, expect, it } from "vitest";
import {
  imageKey,
  imageUrl,
  isProductImageKey,
  makeMain,
  MAX_IMAGE_BYTES,
  moveImage,
  validateImageFile,
} from "./images";

const UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("validateImageFile", () => {
  it("accepts JPEG, PNG and WebP up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile({ type, size: MAX_IMAGE_BYTES })).toBeNull();
    }
  });

  it("explains what is refused", () => {
    expect(validateImageFile({ type: "image/gif", size: 10 })).toMatch(
      /JPEG, PNG ou WebP/,
    );
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toMatch(/5 Mo/);
    expect(validateImageFile({ type: "image/png", size: 0 })).toMatch(/vide/);
  });
});

describe("image keys", () => {
  it("builds a key under the product prefix with the type's extension", () => {
    expect(imageKey("prd_1", UUID, "image/jpeg")).toBe(
      `products/prd_1/${UUID}.jpg`,
    );
  });

  it("only accepts keys generated for that product", () => {
    expect(isProductImageKey("prd_1", `products/prd_1/${UUID}.webp`)).toBe(
      true,
    );
    expect(isProductImageKey("prd_1", `products/prd_2/${UUID}.webp`)).toBe(
      false,
    );
    expect(isProductImageKey("prd_1", `products/prd_1/../x/${UUID}.png`)).toBe(
      false,
    );
    expect(isProductImageKey("prd_1", `products/prd_1/${UUID}.gif`)).toBe(
      false,
    );
  });

  it("joins the public base URL and the key", () => {
    expect(imageUrl("http://localhost:9000/b", "products/p/a.png")).toBe(
      "http://localhost:9000/b/products/p/a.png",
    );
  });
});

describe("ordering", () => {
  const keys = ["a", "b", "c"];

  it("moves an image one step and stays in bounds", () => {
    expect(moveImage(keys, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveImage(keys, "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveImage(keys, "a", -1)).toEqual(keys);
    expect(moveImage(keys, "c", 1)).toEqual(keys);
    expect(moveImage(keys, "z", 1)).toEqual(keys);
  });

  it("puts the main image first", () => {
    expect(makeMain(keys, "c")).toEqual(["c", "a", "b"]);
    expect(makeMain(keys, "z")).toEqual(keys);
  });
});
