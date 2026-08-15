import { test as setup, expect } from '@playwright/test';
import { API_URL } from './env';

setup('API /health is reachable', async ({ request }) => {
  const res = await request.get(`${API_URL}/health`);
  expect(res.ok(), `GET ${API_URL}/health → ${res.status()}`).toBeTruthy();
  const json = (await res.json()) as {
    success?: boolean;
    data?: { status?: string };
    status?: string;
  };
  const status = json.data?.status ?? json.status;
  expect(status).toBe('ok');
});
