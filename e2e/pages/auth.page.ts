import { type Page } from '@playwright/test';

export class AuthPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'User menu' }).click();
    await this.page.getByText('Sign in', { exact: true }).click();
  }

  async signUpTab() {
    await this.page.getByTestId('auth-tab-signup').click();
  }

  get email() { return this.page.getByTestId('login-email'); }
  get password() { return this.page.getByTestId('login-password'); }
  get newPassword() { return this.page.getByTestId('login-password'); }
  get confirmPassword() { return this.page.getByTestId('login-confirm-password'); }
  get loginButton() { return this.page.getByTestId('login-submit'); }
  get createButton() { return this.page.getByTestId('login-submit'); }
  get emailLinkButton() { return this.page.getByRole('button', { name: 'Forgot password? Email me a login link' }); }
  get googleButton() { return this.page.getByRole('button', { name: 'Continue with Google' }); }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  async signup(email: string, password: string) {
    await this.email.fill(email);
    await this.newPassword.fill(password);
    await this.confirmPassword.fill(password);
    await this.createButton.click();
  }
}
