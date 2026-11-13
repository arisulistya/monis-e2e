import { test as base, expect } from './auth.fixture';
import { DeliveryAddressPage } from '../pages/delivery-address.page';
import { StorefrontPage } from '../pages/storefront.page';
import { randomUUID } from 'node:crypto';

type Market = { city: string; category: string; product: string };
type Checkout = { market: Market; switchMarket: (market: Market) => Promise<void> };

export const test = base.extend<{ deliveryAddress: DeliveryAddressPage; checkout: Checkout; addressLabels: () => string; market: Market }>({
  market: [{ city: 'Bali', category: 'Furniture', product: 'Ergonomic Office Chair' }, { option: true }],
  deliveryAddress: async ({ page, baseURL }, use) => {
    if (!baseURL || new URL(baseURL).origin !== 'https://staging.my.monis.rent') {
      throw new Error('Delivery address tests require the staging environment.');
    }
    await page.goto('/');
    const locationAvailable = await page.evaluate(() => new Promise<boolean>(resolve => {
      navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { timeout: 10_000 });
    }));
    if (!locationAvailable) throw new Error('Real browser location is unavailable. Check Chrome and macOS location settings.');
    await use(new DeliveryAddressPage(page));
  },
  checkout: async ({ page, auth, deliveryAddress, market }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required for staging.');

    const store = new StorefrontPage(page);
    const openCart = async () => {
      const [count] = await Promise.all([
        page.waitForResponse(response => new URL(response.url()).hostname === 'staging.strapi.monis.rent' && new URL(response.url()).pathname === '/api/carts' && response.request().method() === 'GET', { timeout: 15_000 }).then(async response => {
          expect(response.ok(), `Staging cart request failed with HTTP ${response.status()}`).toBe(true);
          const headers = await response.request().allHeaders();
          const cartResponse = await page.request.get(response.request().url(), { headers: headers.authorization ? { authorization: headers.authorization } : {} });
          expect(cartResponse.ok(), `Staging cart verification failed with HTTP ${cartResponse.status()}`).toBe(true);
          const payload: unknown = await cartResponse.json();
          if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) throw new Error('Unexpected staging cart response.');
          return payload.data.reduce((total: number, cart: unknown) => {
            if (!cart || typeof cart !== 'object' || !('attributes' in cart) || !cart.attributes || typeof cart.attributes !== 'object' || !('cart_items' in cart.attributes)) throw new Error('Unexpected staging cart data.');
            const items = cart.attributes.cart_items;
            if (!items || typeof items !== 'object' || !('data' in items) || !Array.isArray(items.data)) throw new Error('Unexpected staging cart items.');
            return total + items.data.length;
          }, 0);
        }),
        page.goto('/cart'),
      ]);
      if (count > 0) await expect(page.getByRole('button', { name: 'Clear cart' })).toBeVisible({ timeout: 15_000 });
      else await expect(page.getByRole('heading', { name: 'Looking for your cart?', exact: true })).toBeVisible({ timeout: 15_000 });
      return count;
    };
    const clearCart = async () => {
      if (await openCart() > 0) {
        await page.getByRole('button', { name: 'Clear cart' }).click();
        await expect(page.getByRole('heading', { name: 'Looking for your cart?', exact: true })).toBeVisible({ timeout: 20_000 });
        expect(await openCart(), 'Staging cart must be empty after clearing').toBe(0);
      }
    };
    let addAttempted = false;
    const checkout: Checkout = {
      market,
      switchMarket: async next => {
        await clearCart();
        await page.getByRole('link', { name: 'Start shopping' }).click();
        const location = page.getByRole('button', { name: /^Location / });
        await location.waitFor({ state: 'visible' });
        if (!await page.getByRole('button', { name: `Location ${next.city}`, exact: true }).isVisible()) {
          await location.click();
          await page.getByRole('button', { name: new RegExp(`^(?!Location ).*${next.city}`) }).click();
        }
        await expect(page.getByRole('button', { name: `Location ${next.city}`, exact: true })).toBeVisible({ timeout: 20_000 });
        const card = store.productCard(next.category, next.product);
        await expect(card.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
        addAttempted = true;
        const saved = page.waitForResponse(response => new URL(response.url()).hostname === 'staging.strapi.monis.rent' && new URL(response.url()).pathname === '/api/cart-items' && response.request().method() === 'POST', { timeout: 15_000 });
        await card.getByRole('button', { name: 'Add to Cart' }).click();
        expect((await saved).ok(), 'Adding the staging cart item must succeed').toBe(true);
        await store.cartLink.click();
        const cartItem = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: next.product, exact: true }) });
        await expect(cartItem).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: 'Checkout', exact: true }).click();
        await expect(deliveryAddress.addAddress).toBeVisible();
        checkout.market = next;
      },
    };
    try {
      await test.step('Setup: sign in and check the cart', async () => {
        await auth.open();
        const [authentication] = await Promise.all([
          page.waitForResponse(response => new URL(response.url()).hostname === 'staging.api.monis.rent' && new URL(response.url()).pathname === '/auth/strapi-login', { timeout: 20_000 }),
          auth.login(email, password),
        ]);
        expect(authentication.ok(), `Staging authentication failed with HTTP ${authentication.status()}`).toBe(true);
        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeHidden();
        await page.getByRole('button', { name: 'User menu' }).click();
        await expect(page.getByText(email, { exact: true }).first(), 'Staging account must finish signing in').toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: 'User menu' }).click();
      });
      await test.step('Setup: add a product and open checkout', async () => {
        await checkout.switchMarket(market);
      });
      await use(checkout);
    } finally {
      if (addAttempted) {
        await test.step('Cleanup: remove the test product', async () => {
          await clearCart();
        });
      }
    }
  },
  addressLabels: async ({ checkout, page, deliveryAddress }, use) => {
    const labels: { label: string; market: Market }[] = [];
    await use(() => {
      const label = `E2E ${randomUUID().slice(0, 12)}`;
      labels.push({ label, market: checkout.market });
      return label;
    });
    if (labels.length === 0) return;
    await test.step('Cleanup: delete test-created addresses', async () => {
      await checkout.switchMarket(labels[0].market);
      for (const { label, market } of labels) {
        if (checkout.market.city !== market.city) await checkout.switchMarket(market);
        const address = deliveryAddress.savedAddress(label);
        await expect(address, `Saved test address ${label} must be available for cleanup`).toBeVisible({ timeout: 15_000 });
        await address.getByRole('button', { name: 'Edit' }).click();
        await expect(deliveryAddress.room).toHaveValue(label);
        await page.getByRole('button', { name: 'Delete this address' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
        await expect(deliveryAddress.addAddress).toBeVisible({ timeout: 15_000 });
        await expect(address).toHaveCount(0);
      }
    });
  },
});

export { expect };
