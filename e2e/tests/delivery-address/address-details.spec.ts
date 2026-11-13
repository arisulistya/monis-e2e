import { places } from '../../data/delivery-address';
import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(90_000);

test('MI-805-TC-10 changes the location of a new address', {
  annotation: { type: 'description', description: 'Expected: Changing the location replaces Seminyak Village with the selected Bali place in Address Details.' },
}, async ({ checkout, deliveryAddress, page }) => {
  await test.step('Action: open a new address and select Seminyak Village', async () => {
    await deliveryAddress.addAddress.click();
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
    await deliveryAddress.waitForPlaceSearch();
    await deliveryAddress.search.fill(places.seminyak.query);
    await deliveryAddress.searchResult(places.seminyak.result).click();
  });
  await test.step('Check 1: Address Details shows the original location', async () => {
    await expect(page.getByRole('heading', { name: 'Seminyak Village', exact: true })).toBeVisible();
    await expect(deliveryAddress.details).toBeVisible();
  });
  await test.step('Action: change the location to Kuta Beach', async () => {
    await deliveryAddress.details.click();
    await expect(deliveryAddress.search).toBeVisible();
    await deliveryAddress.search.fill('Kuta Beach');
    await deliveryAddress.searchResult(/^Kuta Beach Badung Regency, Bali, Indonesia$/).click();
  });
  await test.step('Check 2: Address Details shows the replacement location', async () => {
    await expect(deliveryAddress.details).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kuta Beach', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seminyak Village', exact: true })).toBeHidden();
  });
  await test.info().attach('Actual behavior', {
    body: 'Observed: Address Details shows Kuta Beach after changing the location from Seminyak Village.',
    contentType: 'text/plain',
  });
});

for (const scenario of [
  { id: '13', preference: 'Bring it inside', goodToGo: true },
  { id: '15', preference: 'Leave it in save place', goodToGo: false },
  { id: '16', preference: 'Leave at reception', goodToGo: false },
]) {
  test(`MI-805-TC-${scenario.id} saves ${scenario.preference} with empty notes`, {
    annotation: { type: 'description', description: `Expected: ${scenario.preference} and empty driver notes persist when the saved address is edited.` },
  }, async ({ addressLabels, deliveryAddress, page }) => {
    await test.step('Action: select Seminyak Village', async () => {
      await deliveryAddress.addAddress.click();
      await expect(deliveryAddress.search).toBeVisible();
      await deliveryAddress.waitForPlaceSearch();
      await deliveryAddress.search.fill(places.seminyak.query);
      await deliveryAddress.searchResult(places.seminyak.result).click();
    });
    await test.step('Action: choose the delivery preference and save', async () => {
      await page.getByRole('radio', { name: scenario.preference, exact: true }).check();
      if (scenario.goodToGo) await expect(page.getByRole('switch', { name: 'Showing good examples' })).toBeChecked();
      await expect(deliveryAddress.notes).toBeEmpty();
    });
    const label = addressLabels();
    await deliveryAddress.room.fill(label);
    await deliveryAddress.saveAddress();
    await test.step('Action: reopen the saved address', async () => {
      const saved = deliveryAddress.savedAddress(label);
      await expect(saved).toBeVisible({ timeout: 20_000 });
      await saved.getByRole('button', { name: 'Edit' }).click();
    });
    await test.step('Check: preference and empty notes persisted', async () => {
      await expect(deliveryAddress.room).toHaveValue(label);
      await expect(page.getByRole('radio', { name: scenario.preference, exact: true })).toBeChecked();
      if (scenario.goodToGo) await expect(page.getByRole('switch', { name: 'Showing good examples' })).toBeChecked();
      await expect(deliveryAddress.notes).toBeEmpty();
    });
    await test.info().attach('Actual behavior', { body: `Observed: ${scenario.preference} and empty notes persisted after reopening the address.`, contentType: 'text/plain' });
  });
}
