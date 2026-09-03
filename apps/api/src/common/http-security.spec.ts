import { shouldEnableSwagger } from './http-security';

describe('shouldEnableSwagger', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevFlag = process.env.ENABLE_SWAGGER;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
    if (prevFlag === undefined) delete process.env.ENABLE_SWAGGER;
    else process.env.ENABLE_SWAGGER = prevFlag;
  });

  it('is off in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_SWAGGER;
    expect(shouldEnableSwagger()).toBe(false);
  });

  it('can be forced on in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_SWAGGER = 'true';
    expect(shouldEnableSwagger()).toBe(true);
  });

  it('is on outside production unless explicitly disabled', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_SWAGGER;
    expect(shouldEnableSwagger()).toBe(true);
    process.env.ENABLE_SWAGGER = 'false';
    expect(shouldEnableSwagger()).toBe(false);
  });
});
