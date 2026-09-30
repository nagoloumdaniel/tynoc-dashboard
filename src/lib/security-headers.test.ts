import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

const csp = (headers: { key: string; value: string }[]) =>
  headers.find((h) => h.key === "Content-Security-Policy")!.value;

describe("securityHeaders", () => {
  const prod = securityHeaders({
    dev: false,
    imagesOrigin: "https://bucket.s3.eu-west-3.amazonaws.com",
  });

  it("forbids framing, sniffing and leaking referrers", () => {
    const byKey = Object.fromEntries(prod.map((h) => [h.key, h.value]));
    expect(byKey).toMatchObject({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(byKey["Strict-Transport-Security"]).toMatch(/max-age=\d{8}/);
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });

  it("only lets the page talk to itself and the images bucket", () => {
    const policy = csp(prod);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toMatch(
      /connect-src 'self' https:\/\/bucket\.s3\.eu-west-3\.amazonaws\.com/,
    );
    expect(policy).toMatch(/img-src 'self' data: blob: https:\/\/bucket/);
    expect(policy).not.toContain("unsafe-eval");
  });

  it("relaxes only what development needs", () => {
    const dev = securityHeaders({ dev: true, imagesOrigin: null });
    expect(csp(dev)).toContain("'unsafe-eval'");
    expect(dev.some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });
});
