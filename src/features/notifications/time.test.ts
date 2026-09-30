import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

const now = new Date("2026-09-30T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("timeAgo", () => {
  it("says how long ago, in French", () => {
    expect(timeAgo(ago(20_000), now)).toBe("à l'instant");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("il y a 5 minutes");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("il y a 3 heures");
    expect(timeAgo(ago(26 * 3_600_000), now)).toBe("hier");
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe("il y a 4 jours");
  });

  it("treats clock skew as now", () => {
    expect(timeAgo(ago(-30_000), now)).toBe("à l'instant");
  });
});
