import { describe, expect, it } from "vitest";
import { s3PublicBaseUrl } from "./s3-public-url";

describe("s3PublicBaseUrl", () => {
  const base = { bucket: "tynoc-images", region: "eu-west-3" };

  it("uses the regional AWS URL by default", () => {
    expect(s3PublicBaseUrl(base)).toBe(
      "https://tynoc-images.s3.eu-west-3.amazonaws.com",
    );
  });

  it("uses path style on a local endpoint", () => {
    expect(
      s3PublicBaseUrl({ ...base, endpoint: "http://localhost:9000/" }),
    ).toBe("http://localhost:9000/tynoc-images");
  });

  it("prefers an explicit public URL", () => {
    expect(
      s3PublicBaseUrl({
        ...base,
        endpoint: "http://localhost:9000",
        publicUrl: "https://cdn.example.com/",
      }),
    ).toBe("https://cdn.example.com");
  });
});
