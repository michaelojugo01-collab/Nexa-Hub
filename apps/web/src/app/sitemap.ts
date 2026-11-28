import { siteUrl } from '@nexa/config/site';
import type { MetadataRoute } from 'next';

import { getSitemapEntries } from '@/lib/data';

/** Public stores and live products only (the API never returns private or unpublished ones). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    ...entries.map((e) => ({
      url: `${siteUrl}${e.path}`,
      lastModified: e.updatedAt,
      changeFrequency: 'daily' as const,
      priority: e.type === 'store' ? 0.8 : 0.6,
    })),
  ];
}
