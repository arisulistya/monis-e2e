import { createServer } from 'node:http';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { listMessages, waitForLoginLink } from '../e2e/helpers/mailinator';

test('uses a new message and validates its login link', async ({ request, page }) => {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url?.includes('/messages/')
      ? { parts: [{ body: '<a href="https://auth.example.test/login?token=example&amp;next=home">Sign in</a>' }] }
      : { msgs: [{ id: 'old' }, { id: 'new' }] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No local server address');
    const mock = { get: (url: string) => request.get(`http://127.0.0.1:${address.port}${new URL(url).pathname}${new URL(url).search}`) } as APIRequestContext;
    expect((await listMessages(mock, 'testinbox')).map(message => message.id)).toEqual(['old', 'new']);
    const link = await waitForLoginLink(mock, 'testinbox', new Set(['old']), 'auth.example.test', page);
    expect(link).toBe('https://auth.example.test/login?token=example&next=home');
    await expect(waitForLoginLink(mock, 'testinbox', new Set(['old']), 'other.example.test', page))
      .rejects.toThrow('Expected one HTTPS login link');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
