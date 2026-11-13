import { test, expect } from '../../fixtures/delivery-address.fixture';
import { reportIncomplete } from '../../reporting';

test.afterEach(reportIncomplete);
test.setTimeout(120_000);

test('MI-805-TC-39 changes the address with Monis driver', {
  annotation: { type: 'description', description: 'Expected: Changing address A to B retains the eligible Monis delivery method.' },
}, async ({ addressLabels, deliveryAddress, page }) => {
  const addressA = addressLabels();
  await test.step('Setup: create address A', async () => {
    await deliveryAddress.addSavedAddress('Seminyak', /Seminyak Village.*Bali/, addressA);
  });
  const addressB = addressLabels();
  await test.step('Setup: create address B', async () => {
    await deliveryAddress.addSavedAddress('Kuta Beach', /^Kuta Beach Badung Regency, Bali, Indonesia$/, addressB);
  });
  await test.step('Action: select address A and Monis delivery', async () => {
    await deliveryAddress.savedAddress(addressA).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(addressA, { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: /^Monis Go/ }).check();
  });
  await test.step('Action: change to address B', async () => {
    await page.getByRole('button', { name: 'Change address' }).click();
    await deliveryAddress.savedAddress(addressB).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  });
  await test.step('Check: Bill Details shows B and retains Monis delivery', async () => {
    await expect(page.getByText(addressB, { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Monis Go/ })).toBeChecked();
  });
  await test.info().attach('Actual behavior', { body: 'Observed: Bill Details displayed address B with Monis delivery selected.', contentType: 'text/plain' });
});

test.describe('Instant Delivery', () => {
  test.use({ market: { city: 'Bali', category: 'Monitors', product: '24" Full HD Office Monitor 1D' } });
  test('MI-805-TC-40 changes the address with Gojek Instant', {
    annotation: { type: 'description', description: 'Expected: Changing address A to B retains Instant Delivery when both addresses are eligible.' },
  }, async ({ addressLabels, deliveryAddress, page }) => {
    const addressA = addressLabels();
    await test.step('Setup: create address A', async () => {
      await deliveryAddress.addSavedAddress('Seminyak', /Seminyak Village.*Bali/, addressA);
    });
    const addressB = addressLabels();
    await test.step('Setup: create address B', async () => {
      await deliveryAddress.addSavedAddress('Kuta Beach', /^Kuta Beach Badung Regency, Bali, Indonesia$/, addressB);
    });
    await test.step('Action: select address A and Instant Delivery', async () => {
      await deliveryAddress.savedAddress(addressA).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText(addressA, { exact: true })).toBeVisible();
      const instant = page.getByRole('radio', { name: /^Instant Delivery/ });
      await expect(instant).toBeEnabled();
      await instant.check();
    });
    await test.step('Action: change to address B', async () => {
      await page.getByRole('button', { name: 'Change address' }).click();
      await deliveryAddress.savedAddress(addressB).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });
    await test.step('Check: Bill Details shows B and retains Instant Delivery', async () => {
      await expect(page.getByText(addressB, { exact: true })).toBeVisible();
      await expect(page.getByRole('radio', { name: /^Instant Delivery/ })).toBeChecked();
    });
    await test.info().attach('Actual behavior', { body: 'Observed: Bill Details displayed address B with Instant Delivery selected.', contentType: 'text/plain' });
  });
});
