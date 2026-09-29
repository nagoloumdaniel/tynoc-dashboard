export const IDLE_TIMEOUT_S = 12 * 60 * 60;
export const ABSOLUTE_TIMEOUT_S = 7 * 24 * 60 * 60;
// Renew only when less than 11 h remain: at most one write per hour per session.
export const RENEW_BELOW_S = 11 * 60 * 60;

type Expiry = { expiresAt: number; absoluteExpiresAt: number };

export function newSessionTimes(nowS: number): Expiry {
  return {
    expiresAt: nowS + IDLE_TIMEOUT_S,
    absoluteExpiresAt: nowS + ABSOLUTE_TIMEOUT_S,
  };
}

export function isSessionActive(session: Expiry, nowS: number): boolean {
  return nowS < session.expiresAt && nowS < session.absoluteExpiresAt;
}

/** New idle expiry to store, or null when no write is needed. */
export function renewedExpiry(session: Expiry, nowS: number): number | null {
  if (session.expiresAt - nowS >= RENEW_BELOW_S) return null;
  const next = Math.min(nowS + IDLE_TIMEOUT_S, session.absoluteExpiresAt);
  return next > session.expiresAt ? next : null;
}

export const nowInSeconds = () => Math.floor(Date.now() / 1000);
