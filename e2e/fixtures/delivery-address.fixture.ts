import { test as base, expect } from './auth.fixture';
import { DeliveryAddressPage } from '../pages/delivery-address.page';
import { StorefrontPage } from '../pages/storefront.page';
import { randomUUID } from 'node:crypto';
import { markets, savedPlaceDetails } from '../data/delivery-address';

function stagingOrigin(value: string | undefined, name: string): string {
  let url: URL;
  try { url = new URL(value ?? ''); } catch { throw new Error(`${name} must be a staging HTTPS origin in the selected environment file.`); }
  if (url.protocol !== 'https:' || !url.hostname.startsWith('staging.') || !url.hostname.endsWith('.monis.rent') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be a staging HTTPS origin on monis.rent.`);
  }
  return url.origin;
}

type Market = { city: string; category: string; product: string };
type Checkout = { market: Market; switchMarket: (market: Market) => Promise<void>; addressAuthorization: () => Promise<string> };
type AddressLabels = (() => string) & { setup: (query: string, result: RegExp, label: string) => Promise<void> };

export const test = base.extend<{ deliveryAddress: DeliveryAddressPage; checkout: Checkout; addressLabels: AddressLabels; apiAddressLabel: string; market: Market }>({
  market: [markets.bali, { option: true }],
  deliveryAddress: async ({ page, baseURL }, use) => {
    if (process.env.MONIS_ENVIRONMENT !== 'staging') {
      throw new Error('Delivery address tests require the staging environment.');
    }
    stagingOrigin(baseURL, 'BASE_URL');
    stagingOrigin(process.env.MONIS_API_URL, 'MONIS_API_URL');
    stagingOrigin(process.env.MONIS_STRAPI_URL, 'MONIS_STRAPI_URL');
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
    const apiOrigin = stagingOrigin(process.env.MONIS_API_URL, 'MONIS_API_URL');
    const strapiOrigin = stagingOrigin(process.env.MONIS_STRAPI_URL, 'MONIS_STRAPI_URL');
    let cartRequest: { url: string; authorization: string } | undefined;
    let addressHeaders: Promise<Record<string, string>> | undefined;
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === apiOrigin && url.pathname === '/saved-address' && request.method() === 'GET') addressHeaders = request.allHeaders();
    });
    const openCart = async () => {
      const [count] = await Promise.all([
        page.waitForResponse(response => new URL(response.url()).origin === strapiOrigin && new URL(response.url()).pathname === '/api/carts' && response.request().method() === 'GET', { timeout: 15_000 }).then(async response => {
          expect(response.ok(), `Staging cart request failed with HTTP ${response.status()}`).toBe(true);
          const headers = await response.request().allHeaders();
          if (headers.authorization) cartRequest = { url: response.request().url(), authorization: headers.authorization };
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
    const clearCartThroughApi = async () => {
      if (!cartRequest) throw new Error('No authenticated cart request was captured.');
      const headers = { authorization: cartRequest.authorization };
      const fetchCart = async () => {
        const response = await page.request.get(cartRequest!.url, { headers });
        if (!response.ok()) throw new Error(`Cart API returned HTTP ${response.status()}.`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) throw new Error('Unexpected cart response.');
        const ids: number[] = [];
        for (const cart of payload.data) {
          if (!cart || typeof cart !== 'object' || !('attributes' in cart) || !cart.attributes || typeof cart.attributes !== 'object' || !('cart_items' in cart.attributes)) throw new Error('Unexpected cart data.');
          const items = cart.attributes.cart_items;
          if (!items || typeof items !== 'object' || !('data' in items) || !Array.isArray(items.data)) throw new Error('Unexpected cart items.');
          for (const item of items.data) {
            if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'number') throw new Error('Unexpected cart item ID.');
            ids.push(item.id);
          }
        }
        return ids;
      };
      for (const id of await fetchCart()) {
        const response = await page.request.delete(`${strapiOrigin}/api/cart-items/${id}`, { headers });
        if (!response.ok()) throw new Error(`Cart item deletion returned HTTP ${response.status()}.`);
      }
      expect(await fetchCart(), 'Staging cart must be empty after API cleanup').toEqual([]);
    };
    let addAttempted = false;
    const checkout: Checkout = {
      market,
      addressAuthorization: async () => {
        await expect.poll(() => !!addressHeaders, { timeout: 15_000, message: 'Wait for the saved-address request' }).toBe(true);
        const authorization = (await addressHeaders)?.authorization;
        if (!authorization) throw new Error('Saved-address authorization is unavailable.');
        return authorization;
      },
      switchMarket: async next => {
        try {
          await clearCartThroughApi();
          await page.goto('/');
        } catch (error) {
          console.warn('Cart API setup failed; trying the UI.', error);
          await clearCart();
          await page.getByRole('link', { name: 'Start shopping' }).click();
          expect.soft(false, 'Cart API preparation failed; UI fallback was used').toBe(true);
        }
        const location = page.getByRole('button', { name: /^Location / });
        await location.waitFor({ state: 'visible' });
        if (!await page.getByRole('button', { name: `Location ${next.city}`, exact: true }).isVisible()) {
          await location.click();
          await page.getByRole('button', { name: new RegExp(`^(?!Location ).*${next.city}`) }).click();
        }
        await expect(page.getByRole('button', { name: `Location ${next.city}`, exact: true })).toBeVisible({ timeout: 20_000 });
        const cartItem = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: next.product, exact: true }) });
        addAttempted = true;
        let apiError: string | undefined;
        try {
          if (!cartRequest) throw new Error('No authenticated cart request was captured.');
          const headers = { authorization: cartRequest.authorization };
          const cartResponse = await page.request.get(cartRequest.url, { headers });
          if (!cartResponse.ok()) throw new Error(`Cart lookup returned HTTP ${cartResponse.status()}.`);
          const cartPayload: unknown = await cartResponse.json();
          if (!cartPayload || typeof cartPayload !== 'object' || !('data' in cartPayload) || !Array.isArray(cartPayload.data) || cartPayload.data.length !== 1) throw new Error('Expected exactly one staging cart.');
          const cart = cartPayload.data[0];
          if (!cart || typeof cart !== 'object' || !('id' in cart) || typeof cart.id !== 'number') throw new Error('Cart ID is missing.');
          const products = await page.request.get(`${strapiOrigin}/api/products`, { headers, params: { 'filters[name][$eq]': next.product, 'pagination[limit]': '10' } });
          if (!products.ok()) throw new Error(`Product lookup returned HTTP ${products.status()}.`);
          const productPayload: unknown = await products.json();
          if (!productPayload || typeof productPayload !== 'object' || !('data' in productPayload) || !Array.isArray(productPayload.data) || productPayload.data.length !== 1) throw new Error(`Expected one matching product for ${next.product}.`);
          const product = productPayload.data[0];
          if (!product || typeof product !== 'object' || !('id' in product) || typeof product.id !== 'number') throw new Error('Product ID is missing.');
          const added = await page.request.post(`${strapiOrigin}/api/cart-items`, { headers, data: { data: { product: { id: product.id }, product_variant: null, fulfillment_type: 'rental', quantity: 1, cart: cart.id } } });
          if (!added.ok()) throw new Error(`Adding product by API returned HTTP ${added.status()}.`);
          await page.goto('/cart');
          await expect(cartItem).toBeVisible({ timeout: 15_000 });
        } catch (error) {
          apiError = error instanceof Error ? error.message : 'Unknown API setup failure';
          console.warn(`API cart setup failed; trying the UI: ${apiError}`);
          // A failed request may still have created an item; reset before the UI attempt.
          await clearCart();
          await page.getByRole('link', { name: 'Start shopping' }).click();
          const card = store.productCard(next.category, next.product);
          await expect(card.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
          const saved = page.waitForResponse(response => new URL(response.url()).origin === strapiOrigin && new URL(response.url()).pathname === '/api/cart-items' && response.request().method() === 'POST', { timeout: 15_000 });
          await card.getByRole('button', { name: 'Add to Cart' }).click();
          expect((await saved).ok(), 'Adding the staging cart item must succeed').toBe(true);
          await store.cartLink.click();
          await expect(cartItem).toBeVisible({ timeout: 15_000 });
        }
        if (apiError) expect.soft(false, `API cart setup failed; UI fallback used: ${apiError}`).toBe(true);
        await page.getByRole('button', { name: 'Checkout', exact: true }).click();
        await expect(deliveryAddress.addAddress).toBeVisible();
        checkout.market = next;
      },
    };
    try {
      await test.step('Setup: sign in and check the cart', async () => {
        await auth.open();
        const [authentication] = await Promise.all([
          page.waitForResponse(response => new URL(response.url()).origin === apiOrigin && new URL(response.url()).pathname === '/auth/strapi-login', { timeout: 20_000 }).then(async response => {
            if (!response.ok()) throw new Error(`Staging authentication failed with HTTP ${response.status()}.`);
            const payload: unknown = await response.json();
            if (!payload || typeof payload !== 'object' || !('jwt' in payload) || typeof payload.jwt !== 'string' || !('user' in payload) || !payload.user || typeof payload.user !== 'object' || !('id' in payload.user) || typeof payload.user.id !== 'number') throw new Error('Staging login did not provide the cart API session.');
            return { token: payload.jwt, userId: payload.user.id };
          }),
          auth.login(email, password),
        ]);
        const cartUrl = new URL('/api/carts', strapiOrigin);
        cartUrl.searchParams.set('filters[users_permissions_user][id][$eq]', String(authentication.userId));
        cartUrl.searchParams.set('populate[cart_items][populate][product]', '*');
        cartRequest = { url: cartUrl.toString(), authorization: `Bearer ${authentication.token}` };
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
          try {
            await clearCartThroughApi();
          } catch (error) {
            console.warn('Cart API cleanup failed; trying the UI.', error);
            await clearCart();
          }
        });
      }
    }
  },
  apiAddressLabel: async ({ addressLabels }, use) => { await use(addressLabels()); },
  addressLabels: async ({ checkout, page, deliveryAddress }, use) => {
    const apiOrigin = stagingOrigin(process.env.MONIS_API_URL, 'MONIS_API_URL');
    const records: { label: string; market: Market; requested: boolean; created?: Promise<{ id: number; authorization: string }> }[] = [];
    let unexpectedCreate = false;
    const onRequest = (request: import('@playwright/test').Request) => {
      const url = new URL(request.url());
      if (url.origin !== apiOrigin || url.pathname !== '/saved-address' || request.method() !== 'POST') return;
      const record = records.find(entry => request.postData()?.includes(entry.label));
      if (record) record.requested = true;
      else unexpectedCreate = true;
    };
    const onResponse = (response: import('@playwright/test').Response) => {
      const request = response.request();
      const url = new URL(response.url());
      if (url.origin !== apiOrigin || url.pathname !== '/saved-address' || request.method() !== 'POST') return;
      const record = records.find(entry => request.postData()?.includes(entry.label));
      if (!record) return;
      record.created = (async () => {
        if (response.status() !== 201) throw new Error(`Address creation returned HTTP ${response.status()}.`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('data' in payload) || !payload.data || typeof payload.data !== 'object' || !('id' in payload.data) || typeof payload.data.id !== 'number') throw new Error('Address response did not contain a numeric ID.');
        const authorization = (await request.allHeaders()).authorization;
        if (!authorization) throw new Error('Address request did not contain authorization.');
        return { id: payload.data.id, authorization };
      })();
      void record.created.catch(() => {});
    };
    page.on('request', onRequest);
    page.on('response', onResponse);
    try {
      const labels: AddressLabels = Object.assign(() => {
        const label = `E2E ${randomUUID().slice(0, 12)}`;
        records.push({ label, market: checkout.market, requested: false });
        return label;
      }, { setup: async (query: string, result: RegExp, label: string) => {
        const record = records.find(entry => entry.label === label);
        if (!record) throw new Error('Address label was not registered.');
        let apiError: string | undefined;
        let authorization: string | undefined;
        try {
          const place = savedPlaceDetails[query];
          if (!place) throw new Error(`No verified place data for ${query}.`);
          authorization = await checkout.addressAuthorization();
          record.requested = true;
          const response = await page.request.post(`${apiOrigin}/saved-address`, {
            headers: { authorization },
            data: { ...place, room_unit: label, delivery_preference: 'bring_inside', drop_off_detail: null, note: null, reference_photos: [], customer_contacts: [] },
          });
          if (response.status() !== 201) throw new Error(`Address setup returned HTTP ${response.status()}.`);
          const payload: unknown = await response.json();
          if (!payload || typeof payload !== 'object' || !('data' in payload) || !payload.data || typeof payload.data !== 'object' || !('id' in payload.data) || typeof payload.data.id !== 'number') throw new Error('Address setup response did not contain a numeric ID.');
          record.requested = true;
          record.created = Promise.resolve({ id: payload.data.id, authorization });
          await page.reload();
          await expect(deliveryAddress.savedAddress(label)).toBeVisible({ timeout: 20_000 });
        } catch (error) {
          apiError = error instanceof Error ? error.message : 'Unknown address API setup failure';
          console.warn(`Address API setup failed; trying UI: ${apiError}`);
          // Reconcile an uncertain write before a UI fallback to avoid duplicates.
          if (record.requested && !record.created && authorization) {
            const list = await page.request.get(`${apiOrigin}/saved-address`, { headers: { authorization } });
            if (!list.ok()) throw new Error(`Cannot reconcile address setup for ${label}; staging returned HTTP ${list.status()}.`);
            const payload: unknown = await list.json();
            if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) throw new Error(`Cannot reconcile address setup for ${label}.`);
            const matches = payload.data.filter((item: unknown) => !!item && typeof item === 'object' && 'attributes' in item && !!item.attributes && typeof item.attributes === 'object' && 'room_unit' in item.attributes && item.attributes.room_unit === label);
            if (matches.length > 1) throw new Error(`Multiple saved addresses match ${label}; inspect staging.`);
            if (matches.length === 1) {
              const item: unknown = matches[0];
              if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'number') throw new Error(`Cannot identify saved address ${label}.`);
              record.created = Promise.resolve({ id: item.id, authorization });
            } else record.requested = false;
          }
          await page.reload();
          await expect(deliveryAddress.addAddress).toBeVisible({ timeout: 20_000 });
          if (!await deliveryAddress.savedAddress(label).isVisible()) await deliveryAddress.addSavedAddress(query, result, label);
        }
        if (apiError) expect.soft(false, `Address API setup failed; UI fallback used: ${apiError}`).toBe(true);
      } });
      await use(labels);
    } finally {
      page.off('request', onRequest);
      page.off('response', onResponse);
      const failures: string[] = [];
      for (const record of records.filter(entry => entry.requested)) {
        try {
          await test.step('Cleanup: delete test address through API', async () => {
            if (!record.created) throw new Error('Address creation response was not captured.');
            const { id, authorization } = await record.created;
            const headers = { authorization };
            const removed = await page.request.delete(`${apiOrigin}/saved-address/${id}`, { headers });
            if (removed.status() !== 204) throw new Error(`Address deletion returned HTTP ${removed.status()}.`);
            const list = await page.request.get(`${apiOrigin}/saved-address`, { headers });
            if (!list.ok()) throw new Error(`Address verification returned HTTP ${list.status()}.`);
            const payload: unknown = await list.json();
            if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) throw new Error('Unexpected saved-address list response.');
            if (payload.data.some((item: unknown) => !!item && typeof item === 'object' && 'id' in item && item.id === id)) throw new Error('Deleted address remains in saved-address list.');
          });
        } catch (error) {
          console.warn(`Address API cleanup failed for ${record.label}; trying the UI.`, error);
          try {
            await test.step('Cleanup: delete test address through UI', async () => {
              await checkout.switchMarket(record.market);
              const address = deliveryAddress.savedAddress(record.label);
              await expect(address).toBeVisible({ timeout: 15_000 });
              await address.getByRole('button', { name: 'Edit' }).click();
              await expect(deliveryAddress.room).toHaveValue(record.label);
              await page.getByRole('button', { name: 'Delete this address' }).click();
              await page.getByRole('dialog').getByRole('button', { name: 'Yes, Delete' }).click();
              await expect(deliveryAddress.addAddress).toBeVisible({ timeout: 15_000 });
              await expect(address).toHaveCount(0);
            });
          } catch { failures.push(record.label); }
        }
      }
      if (unexpectedCreate) failures.push('unrecognized address creation request');
      if (failures.length) throw new Error(`Could not clean up test addresses: ${failures.join(', ')}`);
    }
  },
});

export { expect };
