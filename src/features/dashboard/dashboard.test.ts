import { describe, expect, it } from "vitest";
import { countByDay, topWishlisted } from "./charts";
import { compare, countInRanges, describeComparison } from "./comparison";
import { parsePeriod, periodRanges, snapshotDate } from "./period";

const NOW = new Date("2026-09-30T12:00:00.000Z");

describe("parsePeriod", () => {
  it("accepts 7, 30 or 90 days and defaults to 30", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod(["90"])).toBe(90);
    expect(parsePeriod("12")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});

describe("periodRanges", () => {
  it("splits the current and previous windows of the same length", () => {
    expect(periodRanges(7, NOW)).toEqual({
      current: {
        from: "2026-09-23T12:00:00.000Z",
        to: "2026-09-30T12:00:00.000Z",
      },
      previous: {
        from: "2026-09-16T12:00:00.000Z",
        to: "2026-09-23T12:00:00.000Z",
      },
    });
  });
});

describe("snapshotDate", () => {
  it("names the UTC day N days ago", () => {
    expect(snapshotDate(NOW, 0)).toBe("2026-09-30");
    expect(snapshotDate(NOW, 30)).toBe("2026-08-31");
  });
});

describe("compare", () => {
  it("computes the change and the percentage", () => {
    expect(compare(12, 10)).toEqual({
      current: 12,
      previous: 10,
      delta: 2,
      percent: 20,
      direction: "up",
    });
    expect(compare(5, 10).direction).toBe("down");
    expect(compare(4, 4).direction).toBe("flat");
  });

  it("has no percentage when the previous value is zero", () => {
    expect(compare(3, 0)).toMatchObject({
      delta: 3,
      percent: null,
      direction: "up",
    });
  });

  it("has no comparison without history", () => {
    expect(compare(7, null)).toMatchObject({
      previous: null,
      delta: null,
      direction: null,
    });
  });
});

describe("describeComparison", () => {
  it.each([
    [compare(12, 10), "+20 % par rapport aux 30 jours précédents"],
    [compare(8, 10), "−20 % par rapport aux 30 jours précédents"],
    [compare(3, 0), "+3 (aucun les 30 jours précédents)"],
    [compare(0, 0), "Stable par rapport aux 30 jours précédents"],
    [compare(7, null), "Pas encore d'historique"],
  ])("%j → %s", (comparison, text) => {
    expect(describeComparison(comparison, 30)).toBe(text);
  });
});

describe("countInRanges", () => {
  it("counts dates in the current and previous windows", () => {
    const ranges = periodRanges(7, NOW);
    expect(
      countInRanges(
        [
          "2026-09-29T10:00:00.000Z",
          "2026-09-24T10:00:00.000Z",
          "2026-09-20T10:00:00.000Z",
          "2026-09-01T10:00:00.000Z",
        ],
        ranges,
      ),
    ).toEqual({ current: 2, previous: 1 });
  });
});

describe("countByDay", () => {
  it("returns one bar per day, zeros included", () => {
    expect(
      countByDay(
        ["2026-09-29T08:00:00.000Z", "2026-09-29T20:00:00.000Z"],
        NOW,
        3,
      ),
    ).toEqual([
      { date: "2026-09-28", label: "28/09", count: 0 },
      { date: "2026-09-29", label: "29/09", count: 2 },
      { date: "2026-09-30", label: "30/09", count: 0 },
    ]);
  });
});

describe("topWishlisted", () => {
  it("ranks products by number of wishlists", () => {
    const names = new Map([
      ["a", "Lampe"],
      ["b", "Chaise"],
    ]);
    expect(
      topWishlisted(
        [
          { productId: "a" },
          { productId: "b" },
          { productId: "a" },
          { productId: "gone" },
        ],
        names,
        2,
      ),
    ).toEqual([
      { id: "a", label: "Lampe", count: 2 },
      { id: "b", label: "Chaise", count: 1 },
    ]);
  });
});
