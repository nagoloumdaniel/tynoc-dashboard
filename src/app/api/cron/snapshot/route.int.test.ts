import { describe, expect, it } from "vitest";
import { GET } from "./route";

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/snapshot", {
      headers: authorization ? { authorization } : {},
    }),
  );

describe("GET /api/cron/snapshot", () => {
  it("refuses a request without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret-value")).status).toBe(401);
  });

  it("writes today's snapshot with the right secret", async () => {
    const response = await call(`Bearer ${process.env.CRON_SECRET}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true });
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
