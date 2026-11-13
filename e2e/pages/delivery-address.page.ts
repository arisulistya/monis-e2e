import type { Page } from '@playwright/test';

export class DeliveryAddressPage {
  constructor(readonly page: Page) {}

  get addAddress() { return this.page.getByRole('button', { name: 'Add a new address' }); }
  get search() { return this.page.getByRole('textbox', { name: 'Ex: Your hotel name, street name, etc.' }); }
  get details() { return this.page.getByRole('button', { name: 'Change location' }); }
  get room() { return this.page.getByRole('textbox', { name: 'Your room/villa number' }); }
  get notes() { return this.page.getByRole('textbox', { name: 'Any detail that we should know while delivering your items...' }); }
  savedAddress(label: string) { return this.page.getByRole('radio').filter({ hasText: label }); }
  searchResult(name: RegExp) { return this.page.getByRole('button', { name }); }

  async saveAddress() {
    await this.page.getByRole('button', { name: 'Save address' }).click();
    await this.page.getByRole('dialog', { name: 'Verify your delivery address' }).getByRole('button', { name: 'Yes, proceed' }).click();
  }

  async addSavedAddress(query: string, result: RegExp, label: string) {
    await this.addAddress.click();
    await this.search.waitFor({ state: 'visible' });
    await this.waitForPlaceSearch();
    await this.search.fill(query);
    await this.searchResult(result).click();
    await this.room.fill(label);
    await this.saveAddress();
    await this.savedAddress(label).waitFor({ state: 'visible', timeout: 20_000 });
  }

  async waitForPlaceSearch() {
    // The input is enabled before the Google Places library has loaded.
    await this.page.waitForFunction('Boolean(window.google?.maps?.places?.AutocompleteService)', null, { timeout: 15_000 });
  }

  async openCheckout() {
    await this.page.goto('/cart');
    await this.page.getByRole('button', { name: 'Checkout', exact: true }).click();
  }
}
