// Pure: evaluated by next.config.ts at build time.

/**
 * HTTP security headers for every response. Scripts allow 'unsafe-inline'
 * (Next.js and next-themes inline scripts, no nonce): React escaping remains
 * the XSS defence; a nonce-based CSP is listed as a future improvement.
 */
export function securityHeaders({
  dev,
  imagesOrigin,
}: {
  dev: boolean;
  imagesOrigin: string | null;
}): { key: string; value: string }[] {
  const images = imagesOrigin ? ` ${imagesOrigin}` : "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: previews while uploading; the bucket for direct image URLs.
    `img-src 'self' data: blob:${images}`,
    "font-src 'self'",
    // Uploads go straight from the browser to the bucket.
    `connect-src 'self'${images}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // No upgrade-insecure-requests: production is HTTPS-only (HSTS) and the
    // E2E build is served over http://localhost with a local S3.
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    ...(dev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]),
  ];
}
