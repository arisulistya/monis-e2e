import { expect, type APIRequestContext, type Page } from '@playwright/test';

const api = 'https://api.mailinator.com/cli/v3/domains/public';

type Message = { id: string };

export async function listMessages(request: APIRequestContext, inbox: string): Promise<Message[]> {
  const response = await request.get(`${api}/inboxes/${encodeURIComponent(inbox)}`, { timeout: 10_000 });
  if (!response.ok()) throw new Error(`Mailinator inbox request failed (HTTP ${response.status()})`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('msgs' in body) || !Array.isArray(body.msgs)) {
    throw new Error('Mailinator returned an unexpected inbox response');
  }
  return body.msgs.map((message: unknown) => {
    if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string') {
      throw new Error('Mailinator returned an invalid message ID');
    }
    return { id: message.id };
  });
}

export async function waitForLoginLink(request: APIRequestContext, inbox: string, oldIds: Set<string>, host: string, page: Page): Promise<string> {
  let messageId: string | undefined;
  await expect.poll(async () => {
    const messages = await listMessages(request, inbox);
    const fresh = messages.filter(message => !oldIds.has(message.id));
    if (fresh.length > 1) throw new Error('Multiple new messages arrived; cannot identify the login email');
    messageId = fresh[0]?.id;
    return Boolean(messageId);
  }, { timeout: 60_000, intervals: [1000, 2000, 5000], message: 'Wait for a new Mailinator message' }).toBe(true);
  if (!messageId) throw new Error('No new Mailinator message');
  const response = await request.get(`${api}/messages/${encodeURIComponent(messageId)}?format=links`, { timeout: 10_000 });
  if (!response.ok()) throw new Error(`Mailinator message request failed (HTTP ${response.status()})`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object') throw new Error('Mailinator returned an invalid message');
  const rawLinks: string[] = [];
  if ('links' in body && Array.isArray(body.links)) {
    for (const link of body.links) {
      if (!link || typeof link !== 'object') continue;
      const value = 'url' in link ? link.url : 'href' in link ? link.href : undefined;
      if (typeof value === 'string') rawLinks.push(value);
    }
  }
  const contents: string[] = [];
  if ('body' in body && typeof body.body === 'string') contents.push(body.body);
  if ('parts' in body && Array.isArray(body.parts)) {
    for (const part of body.parts) {
      if (part && typeof part === 'object' && 'body' in part && typeof part.body === 'string') contents.push(part.body);
    }
  }
  if (contents.length) {
    const extracted = await page.evaluate((parts) => parts.flatMap((part) => {
      const doc = new DOMParser().parseFromString(part, 'text/html');
      const anchors = [...doc.querySelectorAll('a[href]')].map(anchor => anchor.getAttribute('href')).filter((href): href is string => Boolean(href));
      const textUrls = (doc.body.textContent ?? '').match(/https?:\/\/[^\s<>"']+/g) ?? [];
      return [...anchors, ...textUrls];
    }), contents);
    rawLinks.push(...extracted);
  }
  const links = rawLinks.filter(value => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && parsed.hostname === host && !parsed.username && !parsed.password && !parsed.port;
    } catch { return false; }
  });
  const unique = [...new Set(links)];
  if (unique.length !== 1) throw new Error(`Expected one HTTPS login link on AUTH_LINK_HOST; found ${unique.length}`);
  return unique[0];
}
