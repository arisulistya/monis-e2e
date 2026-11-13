import { places } from '../../data/delivery-address';
import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(120_000);

test('MI-805-TC-06 adds a new Bali address', {
  annotation: { type: 'description', description: 'Expected: Seminyak Village is saved and appears in the Bali delivery address list.' },
}, async ({ apiAddressLabel, deliveryAddress, page }) => {
  await test.step('Action: search for a Bali place', async () => {
    await expect(page.getByRole('button', { name: 'Location Bali' })).toBeVisible();
    await deliveryAddress.addAddress.click();
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
    await deliveryAddress.waitForPlaceSearch();
    await deliveryAddress.search.fill(places.seminyak.query);
    await deliveryAddress.searchResult(places.seminyak.result).click();
    await expect(page.getByRole('heading', { name: 'Seminyak Village', exact: true })).toBeVisible();
  });
  const label = apiAddressLabel;
  await test.step('Action: save the address', async () => {
    await deliveryAddress.room.fill(label);
    await deliveryAddress.saveAddress();
  });
  await test.step('Check: the saved Bali address is listed', async () => {
    await expect(deliveryAddress.savedAddress(label)).toContainText('Seminyak Village', { timeout: 20_000 });
  });
  await test.info().attach('Actual behavior', { body: 'Observed: Seminyak Village appeared in the saved Bali address list.', contentType: 'text/plain' });
});

test('MI-805-TC-01 adds an address using current location', {
  annotation: { type: 'description', description: 'Expected: The nearby place selected using the real location is saved with its address.' },
}, async ({ addressLabels, deliveryAddress, page }) => {
  await test.step('Action: find a nearby place', async () => {
    await deliveryAddress.addAddress.click();
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
    await deliveryAddress.waitForPlaceSearch();
    await page.getByRole('button', { name: 'Current location', exact: true }).click();
  });
  const nearbyPlace = page.getByRole('button', { name: /^(?!Location Bali\b).+Bali/i }).first();
  await expect(nearbyPlace).toBeVisible({ timeout: 20_000 });
  const place = (await nearbyPlace.innerText()).split('\n').map(line => line.trim()).filter(Boolean)[1] ?? '';
  expect(place).not.toBe('');
  await test.step('Action: select and save the nearby place', async () => {
    await nearbyPlace.click();
    await expect(page.getByRole('heading', { name: place, exact: true })).toBeVisible();
  });
  const label = addressLabels();
  await deliveryAddress.room.fill(label);
  await deliveryAddress.saveAddress();
  await test.step('Check: the selected place is in the saved address list', async () => {
    await expect(deliveryAddress.savedAddress(label)).toContainText(place, { timeout: 20_000 });
  });
  await test.info().attach('Actual behavior', { body: 'Observed: The selected nearby place appeared in the saved address list.', contentType: 'text/plain' });
});

test('MI-805-TC-34 selects an existing saved address', {
  annotation: { type: 'description', description: 'Expected: Selecting address B shows that address in Bill Details.' },
}, async ({ addressLabels, deliveryAddress, page }) => {
  const addressA = addressLabels();
  await test.step('Setup: create address A', async () => {
    await addressLabels.setup(places.seminyak.query, places.seminyak.result, addressA);
  });
  const addressB = addressLabels();
  await test.step('Setup: create address B', async () => {
    await addressLabels.setup('Kuta Beach', /^Kuta Beach Badung Regency, Bali, Indonesia$/, addressB);
  });
  await test.step('Action: select address B and continue', async () => {
    await expect(deliveryAddress.savedAddress(addressA)).toBeVisible();
    await expect(deliveryAddress.savedAddress(addressB)).toBeVisible();
    await deliveryAddress.savedAddress(addressB).click();
    await expect(deliveryAddress.savedAddress(addressB)).toBeChecked();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  });
  await test.step('Check: Bill Details displays address B', async () => {
    await expect(page.getByRole('button', { name: 'Change address' })).toBeVisible();
    await expect(page.getByText(addressB, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kuta Beach', exact: true })).toBeVisible();
  });
  await test.info().attach('Actual behavior', { body: 'Observed: Bill Details displayed the selected address B.', contentType: 'text/plain' });
});
