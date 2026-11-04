import { reportIncomplete } from '../../reporting';
import { test, expect } from '../../fixtures/auth.fixture';

test.afterEach(reportIncomplete);

test('offers Google login', { annotation: { type: 'description', description: "Expected: The Google sign-in button is visible on both login and sign-up forms." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Check 1: expect(auth.googleButton).toBeVisible()", async () => { await expect(auth.googleButton).toBeVisible(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Check 2: expect(auth.googleButton).toBeVisible()", async () => { await expect(auth.googleButton).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The Google sign-in button is visible on both login and sign-up forms.', contentType: 'text/plain' });
});

test('signs in with the dedicated Google account', { annotation: { type: 'description', description: "Expected: The dedicated Google account signs in and the user menu offers sign-out." } }, async ({ auth, page, context }) => {
  const { GOOGLE_EMAIL: email, GOOGLE_PASSWORD: password } = process.env;
  test.skip(!email || !password, 'Requires dedicated GOOGLE_EMAIL and GOOGLE_PASSWORD');
  if (!email || !password) return;
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  const popupPromise = context.waitForEvent('page', { timeout: 10_000 }).catch(() => null);
  await test.step("Action: auth.googleButton.click()", async () => { await auth.googleButton.click(); });
  const google = await popupPromise ?? page;
  await google.waitForURL(/accounts\.google\.com/, { timeout: 20_000 });
  await test.step("Action: google.getByLabel('Email or phone').fill(email)", async () => { await google.getByLabel('Email or phone').fill(email); });
  await test.step("Action: google.getByRole('button', { name: 'Next' }).click()", async () => { await google.getByRole('button', { name: 'Next' }).click(); });
  const passwordInput = google.getByLabel('Enter your password');
  const challenge = google.getByText(/verify it.s you|captcha|couldn.t sign you in|verify your identity/i).first();
  await test.step("Check 1: expect(passwordInput.or(challenge)).toBeVisible()", async () => { await expect(passwordInput.or(challenge)).toBeVisible(); });
  test.skip(await challenge.isVisible(), 'Blocked by a Google security challenge');
  await passwordInput.fill(password);
  await test.step("Action: google.getByRole('button', { name: 'Next' }).click()", async () => { await google.getByRole('button', { name: 'Next' }).click(); });
  await test.step("Check 2: expect(page.getByRole('button', { name: 'User menu' })).toBeVisible()", async () => { await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible(); });
  await test.step("Action: page.getByRole('button', { name: 'User menu' }).click()", async () => { await page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step("Check 3: expect(page.getByText(/^(?:sign\\s*out|log\\s*out)$/i)).toBeVisible()", async () => { await expect(page.getByText(/^(?:sign\s*out|log\s*out)$/i)).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The dedicated Google account signs in and the user menu offers sign-out.', contentType: 'text/plain' });
});
