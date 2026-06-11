import type { MetadataRoute } from 'next';
import { instruments } from '@/data/instruments';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://abdsynths.com';
  const locales = ['en', 'es'];

  const instrumentUrls = instruments.flatMap((instrument) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/instrument/${instrument.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  const staticUrls = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/${locale}/downloads`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${locale}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
  ]);

  return [...staticUrls, ...instrumentUrls];
}
