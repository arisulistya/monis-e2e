import { reportIncomplete } from '../../reporting';
import { test, expect } from '../../fixtures/auth.fixture';
import { authData } from '../../data/auth.data';
import { newSignupAccount } from '../../data/signup';

test.afterEach(reportIncomplete);

test('requires a sign-up email', { annotation: { type: 'description', description: "Expected: Submitting an empty sign-up form focuses the required email field." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 1: expect(auth.email).toBeFocused()", async () => { await expect(auth.email).toBeFocused(); });
  await test.step("Check 2: expect(auth.email).toHaveJSProperty('validity.valueMissing', true)", async () => { await expect(auth.email).toHaveJSProperty('validity.valueMissing', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: Submitting an empty sign-up form focuses the required email field.', contentType: 'text/plain' });
});

test('rejects an invalid sign-up email', { annotation: { type: 'description', description: "Expected: The sign-up form marks a malformed email as invalid." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.email.fill(authData.invalidEmail)", async () => { await auth.email.fill(authData.invalidEmail); });
  await test.step("Action: auth.newPassword.fill(authData.validFormatPassword)", async () => { await auth.newPassword.fill(authData.validFormatPassword); });
  await test.step("Action: auth.confirmPassword.fill(authData.validFormatPassword)", async () => { await auth.confirmPassword.fill(authData.validFormatPassword); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 1: expect(auth.email).toHaveJSProperty('validity.typeMismatch', true)", async () => { await expect(auth.email).toHaveJSProperty('validity.typeMismatch', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: The sign-up form marks a malformed email as invalid.', contentType: 'text/plain' });
});

test('requires a sign-up password', { annotation: { type: 'description', description: "Expected: Submitting sign-up without a password focuses the required password field." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.email.fill(authData.syntheticEmail)", async () => { await auth.email.fill(authData.syntheticEmail); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 1: expect(auth.newPassword).toBeFocused()", async () => { await expect(auth.newPassword).toBeFocused(); });
  await test.step("Check 2: expect(auth.newPassword).toHaveJSProperty('validity.valueMissing', true)", async () => { await expect(auth.newPassword).toHaveJSProperty('validity.valueMissing', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: Submitting sign-up without a password focuses the required password field.', contentType: 'text/plain' });
});

test('requires password confirmation', { annotation: { type: 'description', description: "Expected: Submitting sign-up without confirmation focuses the required confirmation field." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.email.fill(authData.syntheticEmail)", async () => { await auth.email.fill(authData.syntheticEmail); });
  await test.step("Action: auth.newPassword.fill(authData.validFormatPassword)", async () => { await auth.newPassword.fill(authData.validFormatPassword); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 1: expect(auth.confirmPassword).toBeFocused()", async () => { await expect(auth.confirmPassword).toBeFocused(); });
  await test.step("Check 2: expect(auth.confirmPassword).toHaveJSProperty('validity.valueMissing', true)", async () => { await expect(auth.confirmPassword).toHaveJSProperty('validity.valueMissing', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: Submitting sign-up without confirmation focuses the required confirmation field.', contentType: 'text/plain' });
});

test('shows the password length requirement', { annotation: { type: 'description', description: "Expected: The form displays the six-character requirement and marks a shorter password invalid." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Check 1: expect(auth.page.getByText(/at least\\s+6\\s+characters/i)).toBeVisible()", async () => { await expect(auth.page.getByText(/at least\s+6\s+characters/i)).toBeVisible(); });
  await test.step("Action: auth.email.fill(authData.syntheticEmail)", async () => { await auth.email.fill(authData.syntheticEmail); });
  await test.step("Action: auth.newPassword.fill(authData.shortPassword)", async () => { await auth.newPassword.fill(authData.shortPassword); });
  await test.step("Action: auth.confirmPassword.fill(authData.shortPassword)", async () => { await auth.confirmPassword.fill(authData.shortPassword); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 2: expect(auth.newPassword).toHaveJSProperty('validity.tooShort', true)", async () => { await expect(auth.newPassword).toHaveJSProperty('validity.tooShort', true); });
  await test.info().attach('Actual behavior', { body: 'Observed: The form displays the six-character requirement and marks a shorter password invalid.', contentType: 'text/plain' });
});

test('rejects passwords that do not match', { annotation: { type: 'description', description: "Expected: The sign-up form displays the password mismatch message." } }, async ({ auth }) => {
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.email.fill(authData.syntheticEmail)", async () => { await auth.email.fill(authData.syntheticEmail); });
  await test.step("Action: auth.newPassword.fill(authData.validFormatPassword)", async () => { await auth.newPassword.fill(authData.validFormatPassword); });
  await test.step("Action: auth.confirmPassword.fill(authData.differentPassword)", async () => { await auth.confirmPassword.fill(authData.differentPassword); });
  await test.step("Action: auth.createButton.click()", async () => { await auth.createButton.click(); });
  await test.step("Check 1: expect(auth.page.getByText('The two passwords do not match.')).toBeVisible()", async () => { await expect(auth.page.getByText('The two passwords do not match.')).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The sign-up form displays the password mismatch message.', contentType: 'text/plain' });
});

test('creates a unique account with a test email', { annotation: { type: 'description', description: "Expected: The new account is signed in with its email and the sign-in option returns after logout." } }, async ({ auth }, testInfo) => {
  test.setTimeout(60_000);
  const account = await newSignupAccount();
  test.skip(!account, 'Requires RUN_PRODUCTION_MUTATIONS=1 to create a public Mailinator test account');
  if (!account) return;
  await test.step("Action: auth.open()", async () => { await auth.open(); });
  await test.step("Action: auth.signUpTab()", async () => { await auth.signUpTab(); });
  await test.step("Action: auth.signup(account.email, account.password)", async () => { await auth.signup(account.email, account.password); });
  await test.step("Check 1: expect(auth.page.getByRole('heading', { name: 'Create your account' })).toBeHidden()", async () => { await expect(auth.page.getByRole('heading', { name: 'Create your account' })).toBeHidden(); });
  await test.step("Action: auth.page.getByRole('button', { name: 'User menu' }).click()", async () => { await auth.page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step("Check 2: expect(auth.page.getByText(account.email, { exact: true }).first()).toBeVisible()", async () => { await expect(auth.page.getByText(account.email, { exact: true }).first()).toBeVisible(); });
  await testInfo.attach('signed-in-account', { body: await auth.page.screenshot(), contentType: 'image/png' });
  await test.step("Check 3: expect(auth.page.getByText(/^(?:sign\\s*out|log\\s*out)$/i)).toBeVisible()", async () => { await expect(auth.page.getByText(/^(?:sign\s*out|log\s*out)$/i)).toBeVisible(); });
  await test.step("Action: auth.page.getByText(/^(?:sign\\s*out|log\\s*out)$/i).click()", async () => { await auth.page.getByText(/^(?:sign\s*out|log\s*out)$/i).click(); });
  await test.step("Action: auth.page.getByRole('button', { name: 'User menu' }).click()", async () => { await auth.page.getByRole('button', { name: 'User menu' }).click(); });
  await test.step("Check 4: expect(auth.page.getByText('Sign in', { exact: true })).toBeVisible()", async () => { await expect(auth.page.getByText('Sign in', { exact: true })).toBeVisible(); });
  await testInfo.attach('signed-out', { body: await auth.page.screenshot(), contentType: 'image/png' });
  await test.info().attach('Actual behavior', { body: 'Observed: The new account is signed in with its email and the sign-in option returns after logout.', contentType: 'text/plain' });
});
