import { describe, expect, it } from "vitest";
import {
  ABSOLUTE_TIMEOUT_S,
  IDLE_TIMEOUT_S,
  isSessionActive,
  newSessionTimes,
  renewedExpiry,
} from "./session-policy";

const HOUR = 3600;
const NOW = 1_800_000_000;

describe("newSessionTimes", () => {
  it("expires after 12 h idle and 7 days at most", () => {
    expect(IDLE_TIMEOUT_S).toBe(12 * HOUR);
    expect(ABSOLUTE_TIMEOUT_S).toBe(7 * 24 * HOUR);
    expect(newSessionTimes(NOW)).toEqual({
      expiresAt: NOW + 12 * HOUR,
      absoluteExpiresAt: NOW + 7 * 24 * HOUR,
    });
  });
});

describe("isSessionActive", () => {
  const session = newSessionTimes(NOW);

  it("is active until the idle expiry", () => {
    expect(isSessionActive(session, session.expiresAt - 1)).toBe(true);
    expect(isSessionActive(session, session.expiresAt)).toBe(false);
  });

  it("is inactive past the absolute expiry even if renewed", () => {
    const renewed = { ...session, expiresAt: session.absoluteExpiresAt + HOUR };
    expect(isSessionActive(renewed, session.absoluteExpiresAt)).toBe(false);
  });
});

describe("renewedExpiry", () => {
  const session = newSessionTimes(NOW);

  it("does not renew while 11 h or more remain", () => {
    expect(renewedExpiry(session, NOW + HOUR)).toBeNull();
  });

  it("slides the idle expiry once less than 11 h remain", () => {
    const now = NOW + HOUR + 1;
    expect(renewedExpiry(session, now)).toBe(now + 12 * HOUR);
  });

  it("never extends past the absolute expiry", () => {
    const now = session.absoluteExpiresAt - 2 * HOUR;
    const late = { ...session, expiresAt: now + HOUR };
    expect(renewedExpiry(late, now)).toBe(session.absoluteExpiresAt);
  });

  it("does not renew when the capped expiry would not move", () => {
    const now = session.absoluteExpiresAt - 2 * HOUR;
    const capped = { ...session, expiresAt: session.absoluteExpiresAt };
    expect(renewedExpiry(capped, now)).toBeNull();
  });
});
