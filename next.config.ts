import type { NextConfig } from "next";
import { s3PublicBaseUrl } from "./src/lib/aws/s3-public-url";

// Product images live in S3 (RustFS locally). Evaluated at build time.
const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT || undefined;
const imagesOrigin = bucket
  ? new URL(
      s3PublicBaseUrl({
        bucket,
        region: process.env.AWS_REGION || "eu-west-3",
        endpoint,
        publicUrl: process.env.S3_PUBLIC_URL || undefined,
      }),
    )
  : null;

const nextConfig: NextConfig = {
  experimental: {
    // Enables forbidden() and app/forbidden.tsx (403 for insufficient roles).
    authInterrupts: true,
  },
  images: {
    // The whole host: the dev and test buckets share the local endpoint.
    remotePatterns: imagesOrigin
      ? [
          {
            protocol: imagesOrigin.protocol.replace(":", "") as
              "http" | "https",
            hostname: imagesOrigin.hostname,
            port: imagesOrigin.port,
            pathname: "/**",
          },
        ]
      : [],
    // Only the local RustFS container is on a private IP; never in production.
    dangerouslyAllowLocalIP: !!endpoint,
  },
};

export default nextConfig;
