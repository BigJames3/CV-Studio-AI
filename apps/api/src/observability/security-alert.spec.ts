import { emitSecurityAlert } from './security-alert';
import * as sentry from './sentry';

describe('emitSecurityAlert', () => {
  const fetchMock = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.spyOn(sentry, 'captureServerException').mockImplementation(() => undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
    delete process.env.IR_WEBHOOK_URL;
    fetchMock.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends P1 alerts to Sentry', () => {
    emitSecurityAlert({
      id: 'SEC-01',
      severity: 'P1',
      message: 'Refresh token reuse detected',
    });
    expect(sentry.captureServerException).toHaveBeenCalled();
  });

  it('posts P1 alerts to IR_WEBHOOK_URL when set', () => {
    process.env.IR_WEBHOOK_URL = 'https://example.test/hook';
    emitSecurityAlert({ id: 'SEC-01', severity: 'P1', message: 'test' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/hook',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
