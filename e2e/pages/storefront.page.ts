import type { Page } from '@playwright/test';

export class StorefrontPage {
  constructor(readonly page: Page) {}

  async open() { await this.page.goto('/'); }
  get navigation() { return this.page.getByRole('navigation').first(); }
  get cartLink() { return this.page.getByRole('link', { name: 'Shopping cart' }); }
  get currency() { return this.page.getByRole('button', { name: 'Select currency' }); }
  category(name: string) { return this.navigation.getByRole('link', { name, exact: true }); }
  productCard(region: string, name: string) {
    return this.page.getByRole('region', { name: region }).getByRole('article')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }
}
