import { describe, expect, it } from "vitest";
import { orphanKeys } from "./orphans";

const now = new Date("2026-10-01T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("orphanKeys", () => {
  const objects = [
    { key: "products/p1/a.png", lastModified: hoursAgo(48) }, // attached
    { key: "products/p1/b.png", lastModified: hoursAgo(48) }, // orphan
    { key: "products/p2/c.png", lastModified: hoursAgo(2) }, // upload in progress?
    { key: "products/p3/d.png", lastModified: undefined }, // unknown age
    { key: "other/e.txt", lastModified: hoursAgo(48) }, // not an image upload
  ];

  it("returns old files under products/ that no product lists", () => {
    expect(orphanKeys(objects, new Set(["products/p1/a.png"]), now)).toEqual([
      "products/p1/b.png",
    ]);
  });

  it("leaves recent files alone: their upload may still be attaching", () => {
    expect(orphanKeys(objects, new Set(), now, 1 * 3_600_000)).toContain(
      "products/p2/c.png",
    );
    expect(orphanKeys(objects, new Set(), now)).not.toContain(
      "products/p2/c.png",
    );
  });
});
