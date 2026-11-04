import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { homedir } from 'node:os';
import { join } from 'node:path';

const privateDir = join(homedir(), '.monis-e2e');
const envFile = process.env.MONIS_ENV_FILE || join(privateDir, '.env');
const loaded = config({ path: envFile, quiet: true });
if (loaded.error) throw new Error(`Cannot read environment file: ${envFile}`, { cause: loaded.error });
for (const key of ['TEST_USER_EMAIL', 'TEST_USER_PASSWORD', 'NEGATIVE_TEST_USER_EMAIL', 'NEGATIVE_TEST_USER_PASSWORD', 'MAILINATOR_TEST_EMAIL', 'AUTH_LINK_HOST', 'GOOGLE_EMAIL', 'GOOGLE_PASSWORD']) {
  if (loaded.parsed?.[key] === undefined) delete process.env[key];
  else process.env[key] = loaded.parsed[key];
}
const baseURL = loaded.parsed?.BASE_URL?.trim();
if (!baseURL) throw new Error(`BASE_URL is required in environment file: ${envFile}`);
let target: URL;
try { target = new URL(baseURL); } catch { throw new Error(`BASE_URL must be a valid HTTP(S) URL in ${envFile}`); }
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
  throw new Error(`BASE_URL must be an HTTP(S) URL without credentials, query, or fragment in ${envFile}`);
}
process.env.BASE_URL = baseURL;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: join(privateDir, 'test-results'),
  reporter: [['list'], ['./e2e/result-reporter.ts'], ['allure-playwright', { resultsDir: process.env.ALLURE_RESULTS_DIR || join(privateDir, 'allure-results'), detail: false, environmentInfo: { Target: target.origin, 'Test plan': process.env.MONIS_TEST_PLAN || 'Not specified' } }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    launchOptions: { slowMo: process.env.MONIS_HEADED === '1' ? 500 : 0 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
