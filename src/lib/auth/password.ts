import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP-compatible scrypt cost; ~32 MiB of memory per hash.
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { ...params, maxmem: 256 * params.N * params.r },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Format: scrypt$N$r$p$saltBase64$keyBase64 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(plain, salt, { N, r: R, p: P });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

function parse(stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return null;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  const isPowerOfTwo =
    Number.isInteger(params.N) && (params.N & (params.N - 1)) === 0;
  // Bounds stop a tampered hash from forcing huge memory or CPU use.
  if (!isPowerOfTwo || params.N < 2 || params.N > 2 ** 20) return null;
  if (!Number.isInteger(params.r) || params.r < 1 || params.r > 16) return null;
  if (!Number.isInteger(params.p) || params.p < 1 || params.p > 4) return null;
  const expected = Buffer.from(key, "base64");
  if (expected.length !== KEY_LENGTH) return null;
  return { params, salt: Buffer.from(salt, "base64"), expected };
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  const actual = await derive(plain, parsed.salt, parsed.params);
  return timingSafeEqual(actual, parsed.expected);
}

let dummy: Promise<string> | undefined;

/**
 * Hash of a random secret, verified when the account does not exist so that
 * the response time does not reveal which emails are registered.
 */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(32).toString("base64"));
  return dummy;
}
