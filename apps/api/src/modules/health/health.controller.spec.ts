import { ServiceUnavailableException } from '@nestjs/common';
import { DB_CHECK_TIMEOUT_MS, HealthController } from './health.controller';

function controller(queryRaw: jest.Mock) {
  return new HealthController({ $queryRaw: queryRaw } as never);
}

describe('HealthController', () => {
  afterEach(() => jest.useRealTimers());

  it('liveness never touches the database', () => {
    const queryRaw = jest.fn();
    expect(controller(queryRaw).live()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('readiness is ok when Postgres answers', async () => {
    await expect(controller(jest.fn().mockResolvedValue([1])).ready()).resolves.toEqual({
      status: 'ok',
    });
  });

  it('readiness fails fast when Postgres is down', async () => {
    await expect(
      controller(jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))).ready()
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('readiness and /health answer within the timeout when Postgres hangs (failover)', async () => {
    jest.useFakeTimers();
    const hanging = jest.fn().mockReturnValue(new Promise(() => undefined));
    const health = controller(hanging);

    const ready = health.ready();
    const summary = health.check();
    jest.advanceTimersByTime(DB_CHECK_TIMEOUT_MS);

    await expect(ready).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(summary).resolves.toMatchObject({ status: 'degraded', db: 'down' });
  });
});
