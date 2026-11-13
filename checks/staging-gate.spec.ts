import { test, expect } from '../e2e/fixtures/staging.fixture';

process.env.STAGING_GATE_PASSWORD = 'local-gate-test';

test.describe('staging gate', () => {
  test.use({ baseURL: 'https://staging.my.monis.rent' });

  test('accepts the staging password prompt before navigation completes', async ({ page }) => {
    await page.route('https://staging.my.monis.rent/', route => route.fulfill({
      contentType: 'text/html',
      body: '<main></main><script>document.querySelector("main").textContent = prompt("Password") === "local-gate-test" ? "accepted" : "rejected";</script>',
    }));
    await page.goto('/');
    await expect(page.getByText('accepted', { exact: true })).toBeVisible();
  });

  test('dismisses unrelated prompts without sending the password', async ({ page }) => {
    await page.route('https://staging.my.monis.rent/', route => route.fulfill({
      contentType: 'text/html',
      body: '<main></main><script>document.querySelector("main").textContent = String(prompt("Different prompt"));</script>',
    }));
    await page.goto('/');
    await expect(page.getByText('null', { exact: true })).toBeVisible();
  });

  test('does not send the password after navigating to another origin', async ({ page }) => {
    await page.route('https://other.example/', route => route.fulfill({
      contentType: 'text/html',
      body: '<main></main><script>document.querySelector("main").textContent = String(prompt("Password"));</script>',
    }));
    await page.goto('https://other.example/');
    await expect(page.getByText('null', { exact: true })).toBeVisible();
  });
});

test.describe('other origins', () => {
  test.use({ baseURL: 'https://www.monis.rent' });

  test('does not send the staging password', async ({ page }) => {
    await page.route('https://www.monis.rent/', route => route.fulfill({
      contentType: 'text/html',
      body: '<main></main><script>document.querySelector("main").textContent = String(prompt("Password"));</script>',
    }));
    await page.goto('/');
    await expect(page.getByText('null', { exact: true })).toBeVisible();
  });
});
