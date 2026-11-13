import { defineConfig } from '@playwright/test';

export default defineConfig({ testDir: '.', testMatch: 'staging-gate.spec.ts', reporter: 'list' });
