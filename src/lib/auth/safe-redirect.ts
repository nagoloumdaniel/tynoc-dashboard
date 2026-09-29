const FALLBACK = "/admin";
const INTERNAL_ORIGIN = "http://internal.invalid";

/**
 * Where to send the user after login. Only admin paths on this site are
 * allowed, which blocks open redirects such as ?next=//evil.com.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return FALLBACK;

  let url: URL;
  try {
    url = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== INTERNAL_ORIGIN) return FALLBACK;
  if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) {
    return FALLBACK;
  }
  return url.pathname + url.search;
}
