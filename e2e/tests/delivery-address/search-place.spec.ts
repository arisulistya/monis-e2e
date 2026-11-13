import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(90_000);

test('MI-805-TC-04 searches for a delivery location', {
  annotation: { type: 'description', description: 'Expected: Searching for Seminyak lists Seminyak Village, and selecting it displays the place and its address in Address Details.' },
}, async ({ checkout, deliveryAddress, page }) => {
  await test.step('Action: open a new delivery address', async () => {
    await deliveryAddress.addAddress.click();
  });
  await test.step('Check 1: Search Place is open', async () => {
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
  });
  await test.step('Setup: wait for place search to load', async () => {
    await deliveryAddress.waitForPlaceSearch();
  });
  const result = deliveryAddress.searchResult(/Seminyak Village.*Bali/);
  await test.step('Action: search for Seminyak and select Seminyak Village', async () => {
    await deliveryAddress.search.fill('Seminyak');
    await expect(result).toBeVisible();
    await result.click();
  });
  await test.step('Check 2: Address Details shows the selected place and address', async () => {
    await expect(deliveryAddress.details).toBeVisible();
    await expect(page.getByText('Seminyak Village', { exact: true })).toBeVisible();
    await expect(page.getByText('Seminyak Village, Jl. Kayu Cendana No.8, Seminyak, Kec. Kuta, Kabupaten Badung, Bali 80361, Indonesia', { exact: true })).toBeVisible();
  });
  await test.info().attach('Actual behavior', {
    body: 'Observed: Seminyak Village and its selected address appear in Address Details.',
    contentType: 'text/plain',
  });
});

test('MI-805-TC-05 selects a place using current location', {
  annotation: { type: 'description', description: 'Expected: Current location returns nearby places in Bali, and the selected place appears in Address Details.' },
}, async ({ checkout, deliveryAddress, page }) => {
  await test.step('Action: open a new delivery address', async () => {
    await deliveryAddress.addAddress.click();
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
    await deliveryAddress.waitForPlaceSearch();
  });
  await test.step('Action: request the current location', async () => {
    await page.getByRole('button', { name: 'Current location', exact: true }).click();
  });
  const nearbyPlace = page.getByRole('button', { name: /^(?!Location Bali\b).+Bali/i }).first();
  let selectedPlace = '';
  await test.step('Check 1: a nearby Bali place is available and select it', async () => {
    await expect(nearbyPlace).toBeVisible({ timeout: 20_000 });
    // Current-location results show distance before the place name.
    selectedPlace = (await nearbyPlace.innerText()).split('\n').map(line => line.trim()).filter(Boolean)[1] ?? '';
    expect(selectedPlace).not.toBe('');
    await nearbyPlace.click();
  });
  await test.step('Check 2: Address Details shows the selected place', async () => {
    await expect(deliveryAddress.details).toBeVisible();
    await expect(page.getByRole('heading', { name: selectedPlace, exact: true })).toBeVisible();
  });
  await test.info().attach('Actual behavior', {
    body: 'Observed: Current location returned a Bali place, and Address Details displayed the selected place.',
    contentType: 'text/plain',
  });
});

test('MI-805-TC-02 selects a delivery location on the map', {
  annotation: { type: 'description', description: 'Expected: A location selected on the map is shown in Address Details.' },
}, async ({ checkout, deliveryAddress, page }) => {
  await test.step('Action: open the map from Search Place', async () => {
    await deliveryAddress.addAddress.click();
    await expect(deliveryAddress.search).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Select on map' }).click();
    await expect(page.getByRole('heading', { name: 'Select your location' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeDisabled();
  });
  await test.step('Action: zoom in and place the pin', async () => {
    await page.getByRole('button', { name: 'Zoom in' }).click({ clickCount: 3, timeout: 15_000 });
    const map = await page.getByRole('region', { name: 'Map' }).boundingBox();
    expect(map).not.toBeNull();
    if (!map) throw new Error('The map is not visible.');
    await page.mouse.click(map.x + 120, map.y + 120);
    await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
  });
  await test.step('Check: Address Details displays the selected location', async () => {
    await expect(deliveryAddress.details).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add your address details' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 4 })).not.toBeEmpty();
  });
  await test.info().attach('Actual behavior', { body: 'Observed: The selected map location appeared in Address Details.', contentType: 'text/plain' });
});
