import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/pricing', '/templates'];
  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));
}
