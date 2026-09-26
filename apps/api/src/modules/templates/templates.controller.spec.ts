import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { TemplatesController } from './templates.controller';

describe('TemplatesController routes', () => {
  const routes = Object.getOwnPropertyNames(TemplatesController.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const handler = (TemplatesController.prototype as unknown as Record<string, object>)[name];
      return {
        name,
        method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined,
        path: Reflect.getMetadata(PATH_METADATA, handler) as string | undefined,
      };
    })
    .filter((route) => route.method !== undefined);

  it('exposes read-only routes only (catalogue writes go through prisma db seed)', () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.method).toBe(RequestMethod.GET);
    }
  });

  it('no longer exposes POST /templates/seed', () => {
    expect(routes.map((route) => route.path)).not.toContain('seed');
  });
});
