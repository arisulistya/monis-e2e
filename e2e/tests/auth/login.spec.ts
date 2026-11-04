import { reportIncomplete } from '../../reporting';
import { test, expect } from '../../fixtures/auth.fixture';
import { authData } from '../../test-data/auth.data';
import { newSignupAccount } from '../../test-data/signup';

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

test.afterEach(reportIncomplete);

test('opens login and requires email and password', { annotation: { type: 'description', description: "Expected: The login form appears and submitting it empty focuses the required email field." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Check 1: expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()", async () => { await expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeVisible(); });
  await test.step("Action: auth.loginButton.click()", async () => { await auth.loginButton.click(); });
  await test.step("Check 2: expect(auth.email).toBeFocused()", async () => { await expect(auth.email).toBeFocused(); });
  await test.step("Check 3: expect(auth.email).toHaveJSProperty('validity.valueMissing', true)", async () => { await expect(auth.email).toHaveJSProperty('validity.valueMissing', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: The login form appears and submitting it empty focuses the required email field.', contentType: 'text/plain' });
});

test('requires a password after entering an email', { annotation: { type: 'description', description: "Expected: Submitting login with an email and no password focuses the required password field." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.email.fill(authData.syntheticEmail)", async () => { await auth.email.fill(authData.syntheticEmail); });
  await test.step("Action: auth.loginButton.click()", async () => { await auth.loginButton.click(); });
  await test.step("Check 1: expect(auth.password).toBeFocused()", async () => { await expect(auth.password).toBeFocused(); });
  await test.step("Check 2: expect(auth.password).toHaveJSProperty('validity.valueMissing', true)", async () => { await expect(auth.password).toHaveJSProperty('validity.valueMissing', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: Submitting login with an email and no password focuses the required password field.', contentType: 'text/plain' });
});

test('rejects invalid email format without submitting', { annotation: { type: 'description', description: "Expected: The login form marks a malformed email as invalid." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.email.fill(authData.invalidEmail)", async () => { await auth.email.fill(authData.invalidEmail); });
  await test.step("Action: auth.password.fill('not-a-real-password')", async () => { await auth.password.fill('not-a-real-password'); });
  await test.step("Action: auth.loginButton.click()", async () => { await auth.loginButton.click(); });
  await test.step("Check 1: expect(auth.email).toHaveJSProperty('validity.typeMismatch', true)", async () => { await expect(auth.email).toHaveJSProperty('validity.typeMismatch', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: The login form marks a malformed email as invalid.', contentType: 'text/plain' });
});

test('signs in with the dedicated account and signs out', { annotation: { type: 'description', description: "Expected: The account email appears after login and the sign-in option returns after logout." } }, async ({ auth }, testInfo) => {
  test.skip(!email || !password, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD');
  if (!email || !password) return;
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.login(email, password)", async () => { await auth.login(email, password); });
  await test.step("Check 1: expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeHidden()", async () => { await expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeHidden(); });
  await test.step("Action: auth.page.getByRole('button', { name: 'User menu' }).click()", async () => { await auth.page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step("Check 2: expect(auth.page.getByText(email, { exact: true }).first()).toBeVisible()", async () => { await expect(auth.page.getByText(email, { exact: true }).first()).toBeVisible(); });
  await testInfo.attach('signed-in-account', { body: await auth.page.screenshot(), contentType: 'image/png' });
  const signOut = auth.page.getByText(/^(?:sign\s*out|log\s*out)$/i);
  await test.step("Check 3: expect(signOut).toBeVisible()", async () => { await expect(signOut).toBeVisible(); });
  await test.step("Action: signOut.click()", async () => { await signOut.click(); });
  await test.step("Action: auth.page.getByRole('button', { name: 'User menu' }).click()", async () => { await auth.page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step("Check 4: expect(auth.page.getByText('Sign in', { exact: true })).toBeVisible()", async () => { await expect(auth.page.getByText('Sign in', { exact: true })).toBeVisible(); });
  await testInfo.attach('signed-out', { body: await auth.page.screenshot(), contentType: 'image/png' });
  await test.info().attach('Actual behavior', { body: 'Observed: The account email appears after login and the sign-in option returns after logout.', contentType: 'text/plain' });
});

test('rejects an incorrect password for the dedicated account', { annotation: { type: 'description', description: "Expected: An incorrect password keeps the login form open and displays an error." } }, async ({ auth }) => {
  test.setTimeout(90_000);
  let negativeEmail = process.env.NEGATIVE_TEST_USER_EMAIL;
  let negativePassword = process.env.NEGATIVE_TEST_USER_PASSWORD;
  if (!negativeEmail || !negativePassword || negativeEmail === email) {
    const account = await newSignupAccount();
    test.skip(!account, 'Requires a separate negative test account or RUN_PRODUCTION_MUTATIONS=1 to create one');
    if (!account) return;
    negativeEmail = account.email;
    negativePassword = account.password;
    await test.step("Action: auth.open()", async () => { await auth.open(); });
    await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
    await test.step("Action: auth.signup(negativeEmail, negativePassword)", async () => { await auth.signup(account.email, account.password); });
    await test.step("Check 1: expect(auth.page.getByRole('heading', { name: 'Create your account' })).toBeHidden()", async () => { await expect(auth.page.getByRole('heading', { name: 'Create your account' })).toBeHidden(); });
    await test.step("Action: auth.page.getByRole('button', { name: 'User menu' }).click()", async () => { await auth.page.getByRole('button', { name: 'User menu' }).click(); });
    await test.step("Check 2: expect(auth.page.getByText(negativeEmail, { exact: true }).first()).toBeVisible()", async () => { await expect(auth.page.getByText(account.email, { exact: true }).first()).toBeVisible(); });
    await test.step("Action: auth.page.getByText(/^(?:sign\\s*out|log\\s*out)$/i).click()", async () => { await auth.page.getByText(/^(?:sign\s*out|log\s*out)$/i).click(); });
  }
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.login(negativeEmail, `${negativePassword}-incorrect`)", async () => { await auth.login(negativeEmail, `${negativePassword}-incorrect`); });
  await test.step("Check 3: expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()", async () => { await expect(auth.page.getByRole('heading', { name: 'Welcome back' })).toBeVisible(); });
  await test.step("Check 4: expect(auth.page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible()", async () => { await expect(auth.page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: An incorrect password keeps the login form open and displays an error.', contentType: 'text/plain' });
});
