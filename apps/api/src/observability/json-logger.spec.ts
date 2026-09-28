import { Logger } from '@nestjs/common';
import { JsonLogger, logLevelsFromEnv } from './json-logger';

function capture(levels = logLevelsFromEnv({ NODE_ENV: 'production' })) {
  const lines: string[] = [];
  const logger = new JsonLogger(levels, (line) => lines.push(line));
  const parsed = () => lines.map((l) => JSON.parse(l) as Record<string, unknown>);
  return { logger, lines, parsed };
}

describe('JsonLogger', () => {
  it('writes one JSON object per line with level and context', () => {
    const { logger, lines, parsed } = capture();
    logger.log('Nest application successfully started', 'NestApplication');

    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith('\n')).toBe(true);
    expect(lines[0]).not.toContain(String.fromCharCode(27)); // no ANSI colors
    expect(parsed()[0]).toMatchObject({
      level: 'info',
      context: 'NestApplication',
      msg: 'Nest application successfully started',
    });
    expect(Date.parse(parsed()[0].time as string)).not.toBeNaN();
  });

  it('merges object messages and legacy JSON strings into the line', () => {
    const { logger, parsed } = capture();
    logger.warn({ msg: 'http', status: 401, path: '/api/v1/cvs' }, 'HTTP');
    logger.error(JSON.stringify({ msg: 'security_alert', id: 'SEC-05' }), 'SecurityAlert');

    expect(parsed()[0]).toMatchObject({ level: 'warn', context: 'HTTP', msg: 'http', status: 401 });
    expect(parsed()[1]).toMatchObject({ level: 'error', msg: 'security_alert', id: 'SEC-05' });
  });

  it('keeps the stack of error(message, stack, context)', () => {
    const { logger, parsed } = capture();
    logger.error('boom', 'Error: boom\n    at x.ts:1', 'req-1', 'GlobalExceptionFilter');

    expect(parsed()[0]).toMatchObject({
      level: 'error',
      context: 'GlobalExceptionFilter',
      msg: 'boom',
      stack: 'Error: boom\n    at x.ts:1',
      details: ['req-1'],
    });
  });

  it('serializes Error messages', () => {
    const { logger, parsed } = capture();
    logger.error(new TypeError('bad input'));

    expect(parsed()[0]).toMatchObject({ level: 'error', msg: 'bad input', err: 'TypeError' });
  });

  it('drops levels that are not enabled', () => {
    const { logger, lines } = capture(logLevelsFromEnv({ NODE_ENV: 'production' }));
    logger.debug('noisy', 'Ctx');
    logger.verbose('noisier', 'Ctx');
    expect(lines).toHaveLength(0);

    logger.setLogLevels(logLevelsFromEnv({ LOG_LEVEL: 'debug' }));
    logger.debug('now visible', 'Ctx');
    expect(lines).toHaveLength(1);
  });

  it('never throws on circular data', () => {
    const { logger, parsed } = capture();
    const circular: Record<string, unknown> = { msg: 'loop' };
    circular.self = circular;
    logger.log(circular, 'Ctx');

    expect(parsed()[0]).toMatchObject({ level: 'info', context: 'Ctx', msg: 'loop' });
  });

  it('receives the calls of Nest Logger instances once installed', () => {
    const { logger, parsed } = capture();
    Logger.overrideLogger(logger);
    try {
      new Logger('PaymentsService').log('Webhook processed');
    } finally {
      Logger.overrideLogger(['error', 'warn', 'log']);
    }
    expect(parsed()[0]).toMatchObject({ context: 'PaymentsService', msg: 'Webhook processed' });
  });
});
