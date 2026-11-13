import { test as base, expect } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const target = baseURL ? new URL(baseURL) : undefined;
    if (target?.protocol === 'https:' && target.hostname.startsWith('staging.') && target.hostname.endsWith('.monis.rent')) {
      const password = process.env.STAGING_GATE_PASSWORD;
      if (!password) throw new Error('STAGING_GATE_PASSWORD is required for the staging environment.');
      page.on('dialog', async dialog => {
        const isStaging = dialog.page()?.url().startsWith(`${target.origin}/`) ?? false;
        if (isStaging && dialog.type() === 'prompt' && dialog.message() === 'Password') {
          await dialog.accept(password);
        } else {
          await dialog.dismiss();
        }
      });
    }
    await use(page);
  },
});

test.afterEach(async ({ page, headless }, testInfo) => {
  if (process.env.MONIS_KEEP_OPEN === '1' && !headless && !page.isClosed()) {
    testInfo.setTimeout(testInfo.timeout + 190_000);
    console.log('Keeping the headed browser open for 3 minutes.');
    await delay(180_000);
  }
});

export { expect };
