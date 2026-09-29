import { createHash, randomBytes } from "node:crypto";

/** 256 bits of randomness, sent to the browser in the session cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored, so a database leak does not expose live sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
