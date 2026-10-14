import type { MetadataRoute } from "next";

import { getCategories, getCourses } from "@/lib/api";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const revalidate = 3600;

/**
 * Dynamische Sitemap. Enthält:
 *   - Statische Seiten (/, /kurse)
 *   - Eine /kurse?category=<slug>-Variante pro aktiver Kategorie
 *   - /kurse/<slug> pro aktivem Kurs
 *
 * Fällt auf eine minimale Sitemap (nur statische Routen) zurück, falls das
 * Backend nicht erreichbar ist – damit lebt /sitemap.xml selbst dann, wenn
 * die API kurz weg ist.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/kurse`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const [categories, courses] = await Promise.all([
    getCategories({ next: { revalidate: 3600 } }).catch(() => []),
    getCourses(undefined, { next: { revalidate: 3600 } }).catch(() => ({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/kurse?category=${encodeURIComponent(cat.slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const courseEntries: MetadataRoute.Sitemap = courses.results.map((c) => ({
    url: `${SITE_URL}/kurse/${encodeURIComponent(c.slug)}`,
    lastModified: c.next_session_date ? new Date(c.next_session_date) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...courseEntries];
}
