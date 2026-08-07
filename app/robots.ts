import type { MetadataRoute } from "next";

// This app (admin dashboard + lister portal) must never be crawled or
// indexed — see SEO.md. The root layout's robots metadata (noindex,
// nofollow) and next.config.ts's X-Robots-Tag header stop well-behaved
// crawlers from *indexing* what they find; this stops them from even
// *requesting* pages in the first place, and is the file search engines
// and security scanners actually check for first. No sitemap — one
// existing would contradict "don't index this".
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
