import { describe, expect, it } from "vitest";
import { buildAuditLogItem } from "./audit-log";

describe("buildAuditLogItem", () => {
  it("keys the log by entity and orders it by date", () => {
    const now = new Date("2026-09-29T10:30:00.000Z");
    const item = buildAuditLogItem(
      {
        actorId: "usr_1",
        actorEmail: "admin@example.com",
        action: "LOGIN",
        entityType: "USER",
        entityId: "usr_1",
        summary: "Connexion",
      },
      now,
    );

    expect(item.pk).toBe("USER#usr_1");
    expect(item.sk).toMatch(/^2026-09-29T10:30:00\.000Z#log_/);
    expect(item.id).toMatch(/^log_/);
    expect(item.feed).toBe("LOG");
    expect(item.createdAt).toBe("2026-09-29T10:30:00.000Z");
    expect(item.actorId).toBe("usr_1");
  });
});
