import { ServiceUnavailableException } from '@nestjs/common';
import { oauthFetch, OAUTH_TIMEOUT_MS } from './oauth-fetch';

describe('oauthFetch', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('passes a timeout signal and returns the provider response', async () => {
    const response = new Response('{}', { status: 200 });
    const fetchMock = jest.fn().mockResolvedValue(response);
    global.fetch = fetchMock as never;

    await expect(
      oauthFetch('Google', 'https://oauth2.googleapis.com/token', { method: 'POST' })
    ).resolves.toBe(response);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(OAUTH_TIMEOUT_MS).toBe(10_000);
  });

  it('keeps HTTP error responses for the caller to map (401 OAUTH_FAILED)', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('', { status: 400 })) as never;
    await expect(oauthFetch('LinkedIn', 'https://x')).resolves.toMatchObject({ status: 400 });
  });

  it('turns a timeout or network failure into 503 OAUTH_UNAVAILABLE', async () => {
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), {
      name: 'TimeoutError',
    });
    global.fetch = jest.fn().mockRejectedValue(timeout) as never;

    const error = await oauthFetch('LinkedIn', 'https://x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: 'OAUTH_UNAVAILABLE',
      message: 'LinkedIn sign-in is not responding, please try again',
    });
  });
});
