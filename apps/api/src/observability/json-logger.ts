import type { LoggerService, LogLevel } from '@nestjs/common';

const LEVEL_NAMES: Record<LogLevel, string> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  log: 'info',
  debug: 'debug',
  verbose: 'trace',
};

type Entry = Record<string, unknown>;

export function isJsonLogFormat(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LOG_FORMAT === 'json';
}

/** Nest log levels from LOG_LEVEL (default: `log` in production, `debug` elsewhere). */
export function logLevelsFromEnv(env: NodeJS.ProcessEnv = process.env): LogLevel[] {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'log' : 'debug');
  return level === 'debug' || level === 'verbose'
    ? ['fatal', 'error', 'warn', 'log', 'debug']
    : ['fatal', 'error', 'warn', 'log'];
}

/**
 * One JSON object per line on stdout (LOG_FORMAT=json), so Fluent Bit / CloudWatch can index
 * the fields (`level`, `context`, `requestId`, `status`...). Nest's ConsoleLogger adds colors
 * and a text prefix, which makes the line unparseable.
 *
 * - `logger.log({ msg: 'http', status: 200 })` → fields are merged into the line;
 * - `logger.error(JSON.stringify({...}))` (existing callers) → parsed and merged the same way;
 * - any other string → `msg`.
 */
export class JsonLogger implements LoggerService {
  private levels: Set<LogLevel>;

  constructor(
    levels: LogLevel[] = logLevelsFromEnv(),
    private readonly write: (line: string) => void = (line) => {
      process.stdout.write(line);
    }
  ) {
    this.levels = new Set(levels);
  }

  setLogLevels(levels: LogLevel[]) {
    this.levels = new Set(levels);
  }

  log(message: unknown, ...params: unknown[]) {
    this.emit('log', message, params);
  }

  warn(message: unknown, ...params: unknown[]) {
    this.emit('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]) {
    this.emit('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]) {
    this.emit('verbose', message, params);
  }

  fatal(message: unknown, ...params: unknown[]) {
    this.emit('fatal', message, params);
  }

  error(message: unknown, ...params: unknown[]) {
    this.emit('error', message, params);
  }

  private emit(level: LogLevel, message: unknown, params: unknown[]) {
    if (!this.levels.has(level)) return;

    // Nest appends the logger context as the last string argument.
    const rest = [...params];
    const context =
      rest.length > 0 && typeof rest[rest.length - 1] === 'string'
        ? (rest.pop() as string)
        : undefined;

    const entry: Entry = {
      time: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      ...(context ? { context } : {}),
      ...toFields(message),
    };

    // error(message, stack, ...): Nest passes the stack trace as the first extra argument.
    if ((level === 'error' || level === 'fatal') && typeof rest[0] === 'string') {
      entry.stack = rest.shift();
    }
    if (rest.length > 0) entry.details = rest.map(serializable);

    this.write(`${stringify(entry)}\n`);
  }
}

function toFields(message: unknown): Entry {
  if (message instanceof Error) {
    return { msg: message.message, err: message.name, stack: message.stack };
  }
  if (typeof message === 'string') {
    if (message.startsWith('{')) {
      try {
        const parsed = JSON.parse(message) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Entry;
      } catch {
        /* plain text that happens to start with "{" */
      }
    }
    return { msg: message };
  }
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    return { ...(message as Entry) };
  }
  return { msg: serializable(message) };
}

function serializable(value: unknown): unknown {
  if (value instanceof Error) return { err: value.name, msg: value.message, stack: value.stack };
  return value;
}

function stringify(entry: Entry): string {
  try {
    return JSON.stringify(entry);
  } catch {
    // Circular structure or BigInt: keep the line, lose the fields.
    return JSON.stringify({
      time: entry.time,
      level: entry.level,
      context: entry.context,
      msg: String(entry.msg ?? ''),
    });
  }
}
