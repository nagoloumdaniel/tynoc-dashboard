import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newSessionTimes, nowInSeconds } from "./session-policy";
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  findSession,
  type SessionRecord,
  touchSession,
} from "./session-repository";
import { generateSessionToken, hashToken } from "./tokens";

function makeSession(userId = `usr_${randomUUID()}`): SessionRecord {
  const now = new Date().toISOString();
  return {
    pk: hashToken(generateSessionToken()),
    userId,
    role: "ADMIN",
    email: "admin@example.com",
    name: "Admin",
    createdAt: now,
    lastSeenAt: now,
    ...newSessionTimes(nowInSeconds()),
  };
}

describe("session repository", () => {
  it("creates then finds a session", async () => {
    const session = makeSession();
    await createSession(session);
    expect(await findSession(session.pk)).toEqual(session);
  });

  it("returns null for an unknown session", async () => {
    expect(await findSession(hashToken("nope"))).toBeNull();
  });

  it("refuses to overwrite an existing session", async () => {
    const session = makeSession();
    await createSession(session);
    await expect(createSession(session)).rejects.toThrow();
  });

  it("updates the idle expiry on touch", async () => {
    const session = makeSession();
    await createSession(session);
    const lastSeenAt = new Date().toISOString();

    await touchSession(session.pk, session.expiresAt + 60, lastSeenAt);

    const updated = await findSession(session.pk);
    expect(updated?.expiresAt).toBe(session.expiresAt + 60);
    expect(updated?.lastSeenAt).toBe(lastSeenAt);
  });

  it("deletes a session", async () => {
    const session = makeSession();
    await createSession(session);
    await deleteSession(session.pk);
    expect(await findSession(session.pk)).toBeNull();
  });

  it("deletes every session of one user only", async () => {
    const userId = `usr_${randomUUID()}`;
    const first = makeSession(userId);
    const second = makeSession(userId);
    const other = makeSession();
    await Promise.all([first, second, other].map(createSession));

    expect(await deleteUserSessions(userId)).toBe(2);

    expect(await findSession(first.pk)).toBeNull();
    expect(await findSession(second.pk)).toBeNull();
    expect(await findSession(other.pk)).not.toBeNull();
  });
});
