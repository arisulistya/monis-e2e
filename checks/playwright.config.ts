import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'mailinator.spec.ts',
  reporter: 'list',
  use: { headless: true },
});
