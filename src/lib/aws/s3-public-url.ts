// Pure: shared by next.config.ts, the scripts and the app.

/**
 * Base URL where the bucket's public objects are read. An explicit
 * S3_PUBLIC_URL wins (e.g. a CDN); otherwise the local endpoint (RustFS,
 * path style) or the regional AWS URL (virtual-hosted style).
 */
export function s3PublicBaseUrl({
  bucket,
  region,
  endpoint,
  publicUrl,
}: {
  bucket: string;
  region: string;
  endpoint?: string;
  publicUrl?: string;
}): string {
  if (publicUrl) return publicUrl.replace(/\/+$/, "");
  if (endpoint) return `${endpoint.replace(/\/+$/, "")}/${bucket}`;
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}
