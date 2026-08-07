import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
