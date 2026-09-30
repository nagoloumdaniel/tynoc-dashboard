import { describe, expect, it } from "vitest";
import { describeChanges, formatChangeValue } from "./changes";

describe("formatChangeValue", () => {
  it("names missing values", () => {
    expect(formatChangeValue("phone", null)).toBe("(vide)");
    expect(formatChangeValue("phone", undefined)).toBe("(vide)");
    expect(formatChangeValue("phone", "")).toBe("(vide)");
  });

  it("formats prices stored in cents", () => {
    expect(formatChangeValue("priceInCents", 2499)).toMatch(/24,99/);
  });

  it("translates known codes", () => {
    expect(formatChangeValue("role", "VIEWER")).toBe("Lecture seule");
    expect(formatChangeValue("role", "CUSTOMER")).toBe("Client");
    expect(formatChangeValue("reason", "RESTOCK")).toBe("Réapprovisionnement");
    expect(formatChangeValue("status", "DRAFT")).toBe("Brouillon");
    expect(formatChangeValue("isActive", false)).toBe("Non");
  });

  it("keeps other values readable and short", () => {
    expect(formatChangeValue("stock", 12)).toBe("12");
    expect(formatChangeValue("status", "UNKNOWN")).toBe("UNKNOWN");
    expect(formatChangeValue("description", "a".repeat(200))).toHaveLength(120);
    expect(formatChangeValue("tags", ["a", "b"])).toBe('["a","b"]');
  });
});

describe("describeChanges", () => {
  it("labels each field in a stable order", () => {
    expect(
      describeChanges({
        stock: { from: 3, to: 10 },
        name: { from: "Old", to: "New" },
        custom: { from: 1, to: 2 },
      }),
    ).toEqual([
      { field: "custom", label: "custom", from: "1", to: "2" },
      { field: "name", label: "Nom", from: "Old", to: "New" },
      { field: "stock", label: "Stock", from: "3", to: "10" },
    ]);
  });

  it("returns nothing without changes", () => {
    expect(describeChanges(undefined)).toEqual([]);
  });
});
