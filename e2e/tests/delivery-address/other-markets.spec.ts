import { places, markets } from '../../data/delivery-address';
import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(120_000);

for (const scenario of [
  { id: '07', market: markets.chiangMai, ...places.chiangMai },
  { id: '08', market: markets.lisbon, ...places.lisbon },
]) {
  test.describe(`${scenario.market.city} delivery address`, () => {
    test.use({ market: scenario.market });
    test(`MI-805-TC-${scenario.id} adds an address in ${scenario.market.city}`, {
      annotation: { type: 'description', description: `Expected: A ${scenario.market.city} address is saved for the matching booking location.` },
    }, async ({ addressLabels, deliveryAddress, page }) => {
      await test.step('Action: select a place in the booking location', async () => {
        await expect(page.getByRole('button', { name: `Location ${scenario.market.city}` })).toBeVisible();
        await deliveryAddress.addAddress.click();
        await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
        await deliveryAddress.waitForPlaceSearch();
        await deliveryAddress.search.fill(scenario.query);
        await deliveryAddress.searchResult(scenario.result).click();
        await expect(page.getByRole('heading', { name: scenario.name, exact: true })).toBeVisible();
      });
      const label = addressLabels();
      await test.step('Action: save the selected address', async () => {
        await deliveryAddress.room.fill(label);
        await deliveryAddress.saveAddress();
      });
      await test.step('Check: the selected place is saved', async () => {
        await expect(deliveryAddress.savedAddress(label)).toContainText(scenario.name, { timeout: 20_000 });
      });
      await test.info().attach('Actual behavior', { body: `Observed: ${scenario.name} appeared in the saved address list.`, contentType: 'text/plain' });
    });
  });
}

test.describe('Location group filtering', () => {
  test.use({ market: markets.chiangMai });
  test('MI-805-TC-50 filters saved addresses by booking location group', {
    annotation: { type: 'description', description: 'Expected: A Bali booking allows a Bali address and does not allow the Chiang Mai address.' },
  }, async ({ checkout, addressLabels, deliveryAddress, page }) => {
    test.setTimeout(180_000);
    const thailandAddress = addressLabels();
    await test.step('Setup: save a Chiang Mai address', async () => {
      await addressLabels.setup(places.chiangMai.query, places.chiangMai.result, thailandAddress);
    });
    await test.step('Setup: switch to a Bali booking', async () => {
      await checkout.switchMarket(markets.bali);
    });
    const baliAddress = addressLabels();
    await test.step('Setup: save a Bali address', async () => {
      await addressLabels.setup(places.seminyak.query, places.seminyak.result, baliAddress);
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
