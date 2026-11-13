import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(120_000);

for (const scenario of [
  { id: '07', city: 'Chiang Mai', product: '24" Full HD Office Monitor MP251', query: 'MAYA Lifestyle Shopping Center', result: /^MAYA Lifestyle Shopping Center.*Chiang Mai/i, place: 'MAYA Lifestyle Shopping Center' },
  { id: '08', city: 'Lisbon', product: 'Lisbon Monitor incom', query: 'Armazéns do Chiado', result: /^Armazéns do Chiado Rua do Carmo, Lisbon, Portugal$/i, place: 'Armazéns do Chiado' },
]) {
  test.describe(`${scenario.city} delivery address`, () => {
    test.use({ market: { city: scenario.city, category: 'Monitors', product: scenario.product } });
    test(`MI-805-TC-${scenario.id} adds an address in ${scenario.city}`, {
      annotation: { type: 'description', description: `Expected: A ${scenario.city} address is saved for the matching booking location.` },
    }, async ({ addressLabels, deliveryAddress, page }) => {
      await test.step('Action: select a place in the booking location', async () => {
        await expect(page.getByRole('button', { name: `Location ${scenario.city}` })).toBeVisible();
        await deliveryAddress.addAddress.click();
        await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
        await deliveryAddress.waitForPlaceSearch();
        await deliveryAddress.search.fill(scenario.query);
        await deliveryAddress.searchResult(scenario.result).click();
        await expect(page.getByRole('heading', { name: scenario.place, exact: true })).toBeVisible();
      });
      const label = addressLabels();
      await test.step('Action: save the selected address', async () => {
        await deliveryAddress.room.fill(label);
        await deliveryAddress.saveAddress();
      });
      await test.step('Check: the selected place is saved', async () => {
        await expect(deliveryAddress.savedAddress(label)).toContainText(scenario.place, { timeout: 20_000 });
      });
      await test.info().attach('Actual behavior', { body: `Observed: ${scenario.place} appeared in the saved address list.`, contentType: 'text/plain' });
    });
  });
}

test.describe('Location group filtering', () => {
  test.use({ market: { city: 'Chiang Mai', category: 'Monitors', product: '24" Full HD Office Monitor MP251' } });
  test('MI-805-TC-50 filters saved addresses by booking location group', {
    annotation: { type: 'description', description: 'Expected: A Bali booking allows a Bali address and does not allow the Chiang Mai address.' },
  }, async ({ checkout, addressLabels, deliveryAddress, page }) => {
    test.setTimeout(180_000);
    const thailandAddress = addressLabels();
    await test.step('Setup: save a Chiang Mai address', async () => {
      await deliveryAddress.addSavedAddress('MAYA Lifestyle Shopping Center', /^MAYA Lifestyle Shopping Center.*Chiang Mai/i, thailandAddress);
    });
    await test.step('Setup: switch to a Bali booking', async () => {
      await checkout.switchMarket({ city: 'Bali', category: 'Furniture', product: 'Ergonomic Office Chair' });
    });
    const baliAddress = addressLabels();
    await test.step('Setup: save a Bali address', async () => {
      await deliveryAddress.addSavedAddress('Seminyak', /Seminyak Village.*Bali/, baliAddress);
    });
    await test.step('Check: only the Bali address is selectable', async () => {
      await expect(deliveryAddress.savedAddress(baliAddress)).toBeVisible();
      const otherMarket = deliveryAddress.savedAddress(thailandAddress);
      if (await otherMarket.count()) await expect(otherMarket).toBeDisabled();
      else await expect(otherMarket).toHaveCount(0);
    });
    await test.step('Action: continue with the Bali address', async () => {
      await deliveryAddress.savedAddress(baliAddress).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText(baliAddress, { exact: true })).toBeVisible();
    });
    await test.info().attach('Actual behavior', { body: 'Observed: The Bali address was selectable, the Chiang Mai address was not, and Bill Details showed the Bali address.', contentType: 'text/plain' });
  });
});
