import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/templates'],
        disallow: ['/dashboard', '/editor', '/account', '/analytics', '/api'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
