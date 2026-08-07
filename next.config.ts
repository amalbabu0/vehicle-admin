import type { NextConfig } from "next";

// next/image refuses to optimize a remote host unless it's explicitly
// allow-listed. Vehicle cover images are served from IMAGES_CDN_URL (R2,
// a different domain from this app's own) — without this, every
// next/image usage pointed at a vehicle image (the admin listings table,
// the lister vehicle cards) throws at request time, not build time, so it
// was going unnoticed. Derived from the env var rather than hardcoded so
// it tracks whatever real CDN domain each environment actually uses.
const imagesCdnUrl = process.env.IMAGES_CDN_URL ? new URL(process.env.IMAGES_CDN_URL) : null;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: imagesCdnUrl
      ? [{ protocol: imagesCdnUrl.protocol.replace(":", "") as "http" | "https", hostname: imagesCdnUrl.hostname }]
      : [],
  },
  // Admin app must never be indexed (see SEO.md — "the admin app: the
  // opposite of SEO"). The root layout's `robots` metadata already emits a
  // <meta name="robots" content="noindex, nofollow"> tag; this adds the
  // equivalent HTTP header on every response as defense in depth — it
  // applies before the HTML is even parsed and covers non-HTML responses
  // the meta tag can't reach.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
