import { reportIncomplete } from '../../reporting';
import { listMessages, waitForLoginLink } from '../../helpers/mailinator';
import { test, expect } from '../../fixtures/auth.fixture';

test.afterEach(reportIncomplete);

test('requires an email address before requesting a login link', { annotation: { type: 'description', description: "Expected: Requesting a login link without an email shows the required-email message." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.emailLinkButton.click()", async () => { await auth.emailLinkButton.click(); });
  await test.step("Check 1: expect(auth.page.getByText('Please enter your email address first.')).toBeVisible()", async () => { await expect(auth.page.getByText('Please enter your email address first.')).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: Requesting a login link without an email shows the required-email message.', contentType: 'text/plain' });
});

test('logs in using an emailed link', { annotation: { type: 'description', description: "Expected: An eligible email link opens an authenticated session with a sign-out option." } }, async ({ auth, page, request }) => {
  const { MAILINATOR_TEST_EMAIL: email, AUTH_LINK_HOST: host, RUN_PRODUCTION_MUTATIONS: enabled } = process.env;
  test.skip(!email || !host || enabled !== '1', 'Requires MAILINATOR_TEST_EMAIL, AUTH_LINK_HOST, and RUN_PRODUCTION_MUTATIONS=1');
  if (!email || !host || enabled !== '1') return;
  const match = /^([a-z0-9](?:[a-z0-9.]{0,48}[a-z0-9])?)@mailinator\.com$/i.exec(email);
  if (!match || email.toLowerCase() === process.env.TEST_USER_EMAIL?.toLowerCase()) throw new Error('MAILINATOR_TEST_EMAIL must be a separate dedicated public Mailinator account');
  const inbox = match[1];
  test.setTimeout(90_000);
  const oldIds = new Set((await listMessages(request, inbox)).map(message => message.id));
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.email.fill(email)", async () => { await auth.email.fill(email); });
  await test.step("Action: auth.emailLinkButton.click()", async () => { await auth.emailLinkButton.click(); });
  const url = await test.step('Retrieve the new login link from Mailinator', () => waitForLoginLink(request, inbox, oldIds, host, page));
  await test.step("Action: page.goto(url)", async () => { await page.goto(url); });
  await test.step("Action: page.getByRole('button', { name: 'User menu' }).click()", async () => { await page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step('Verify the signed-in account matches the Mailinator test user', async () => { await expect(page.getByText(email, { exact: true }).first()).toBeVisible(); });
  await test.step("Check 1: expect(page.getByText(/^(?:sign\\s*out|log\\s*out)$/i)).toBeVisible()", async () => { await expect(page.getByText(/^(?:sign\s*out|log\s*out)$/i)).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: An eligible email link opens an authenticated session with a sign-out option.', contentType: 'text/plain' });
});
