import type { MetadataRoute } from "next";

/**
 * Admin-UI darf NIE indexiert werden. Dies ist redundant zum
 * `robots: { index: false }`-Meta-Tag im Root-Layout, deckt aber den Fall ab,
 * dass ein Crawler die HTML-Seite gar nicht erst rendert.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
