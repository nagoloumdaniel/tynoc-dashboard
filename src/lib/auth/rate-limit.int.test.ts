import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  checkLoginAllowed,
  clearLoginFailures,
  MAX_LOGIN_FAILURES,
  recordLoginFailure,
} from "./rate-limit";

const email = () => `${randomUUID()}@example.com`;
// Any unique string works as a client address key.
const ip = () => `test-ip-${randomUUID()}`;

async function fail(times: number, userEmail: string, userIp: string) {
  for (let i = 0; i < times; i++) await recordLoginFailure(userEmail, userIp);
}

describe("login rate limit", () => {
  it("allows a fresh email and ip", async () => {
    expect(await checkLoginAllowed(email(), ip())).toBe(true);
  });

  it("still allows after 4 failures", async () => {
    const [e, i] = [email(), ip()];
    await fail(MAX_LOGIN_FAILURES - 1, e, i);
    expect(await checkLoginAllowed(e, i)).toBe(true);
  });

  it("blocks the email after 5 failures, even from another ip", async () => {
    const e = email();
    await fail(MAX_LOGIN_FAILURES, e, ip());
    expect(await checkLoginAllowed(e, ip())).toBe(false);
  });

  it("blocks an ip that fails on 5 different emails", async () => {
    const i = ip();
    for (let n = 0; n < MAX_LOGIN_FAILURES; n++) await fail(1, email(), i);
    expect(await checkLoginAllowed(email(), i)).toBe(false);
  });

  it("unblocks the email once failures are cleared", async () => {
    const e = email();
    await fail(MAX_LOGIN_FAILURES, e, ip());
    await clearLoginFailures(e);
    expect(await checkLoginAllowed(e, ip())).toBe(true);
  });
});
