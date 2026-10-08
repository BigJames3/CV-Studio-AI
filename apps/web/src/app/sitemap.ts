import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/pricing',
    '/templates',
    '/privacy',
    '/terms',
    '/subscription-terms',
    '/refund-policy',
    '/cookie-policy',
    '/legal-notice',
  ];
  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/pricing' || route === '/templates' ? 0.8 : 0.3,
  }));
}
