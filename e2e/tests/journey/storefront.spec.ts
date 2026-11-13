import { reportIncomplete } from '../../reporting';
import { test, expect } from '../../fixtures/staging.fixture';
import { StorefrontPage } from '../../pages/storefront.page';

const chair = 'Ergonomic Office Chair';

test.afterEach(reportIncomplete);

test('browse a category and open a product', { annotation: { type: 'description', description: "Expected: The furniture category and selected chair details open with their expected headings." } }, async ({ page }) => {
  const store = new StorefrontPage(page);
  await test.step("Action: store.open()", async () => { await store.open(); });
  await test.step("Action: store.category('Furniture').click()", async () => { await store.category('Furniture').click(); });
  await test.step("Check 1: expect(page).toHaveURL(/\\/categories\\/furniture\\/bali/)", async () => { await expect(page).toHaveURL(/\/categories\/furniture\/bali/); });
  await test.step("Check 2: expect(page.getByRole('heading', { name: 'Rent Furniture in Bali', level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Rent Furniture in Bali', level: 1 })).toBeVisible(); });
  await test.step("Action: page.getByRole('article').filter({ has: page.getByRole('heading', { name: chair, exact: true }) }).first().getByRole('link').first().click()", async () => { await page.getByRole('article').filter({ has: page.getByRole('heading', { name: chair, exact: true }) }).first().getByRole('link').first().click(); });
  await test.step("Check 3: expect(page.getByRole('heading', { name: 'Rent Ergonomic Office Chair in Bali', level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Rent Ergonomic Office Chair in Bali', level: 1 })).toBeVisible(); });
  await test.step("Check 4: expect(page.getByRole('heading', { name: 'Under the hood' })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Under the hood' })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The furniture category and selected chair details open with their expected headings.', contentType: 'text/plain' });
});

test('search shows a matching product and opens its details', { annotation: { type: 'description', description: "Expected: Searching for A24i shows a matching result and opens its product page." } }, async ({ page }) => {
  await test.step("Action: page.goto('/categories/monitors/bali')", async () => { await page.goto('/categories/monitors/bali'); });
  await test.step("Action: page.getByPlaceholder('Search products...').fill('A24i')", async () => { await page.getByPlaceholder('Search products...').fill('A24i'); });
  const result = page.getByRole('link', { name: /24.*Full HD Office Monitor A24i 2026/ }).first();
  await test.step("Check 1: expect(result).toBeVisible()", async () => { await expect(result).toBeVisible(); });
  await test.step("Action: result.click()", async () => { await result.click(); });
  await test.step("Check 2: expect(page).toHaveURL(/\\/products\\/24-full-hd-office-monitor-a24i-2026/)", async () => { await expect(page).toHaveURL(/\/products\/24-full-hd-office-monitor-a24i-2026/); });
  await test.step("Check 3: expect(page.getByRole('heading', { name: /Rent 24.*Full HD Office Monitor A24i 2026/, level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: /Rent 24.*Full HD Office Monitor A24i 2026/, level: 1 })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: Searching for A24i shows a matching result and opens its product page.', contentType: 'text/plain' });
});

test('search reports when there is no matching product', { annotation: { type: 'description', description: "Expected: An unmatched search displays the no-results message and a link to all products." } }, async ({ page }) => {
  await test.step("Action: page.goto('/categories/monitors/bali')", async () => { await page.goto('/categories/monitors/bali'); });
  await test.step("Action: page.getByPlaceholder('Search products...').fill('zzzznotaproductqwerty')", async () => { await page.getByPlaceholder('Search products...').fill('zzzznotaproductqwerty'); });
  await test.step("Check 1: expect(page.getByText('No results found.')).toBeVisible()", async () => { await expect(page.getByText('No results found.')).toBeVisible(); });
  await test.step("Check 2: expect(page.getByRole('link', { name: 'Show all products' })).toBeVisible()", async () => { await expect(page.getByRole('link', { name: 'Show all products' })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: An unmatched search displays the no-results message and a link to all products.', contentType: 'text/plain' });
});

test('select an available product variant and inspect rental options', { annotation: { type: 'description', description: "Expected: The large desk variant can be selected, rental options appear, and the cart shows the selected variant." } }, async ({ page }) => {
  await test.step("Action: page.goto('/products/electrical-adjustable-desk')", async () => { await page.goto('/products/electrical-adjustable-desk'); });
  await test.step("Check 1: expect(page.getByRole('heading', { name: 'Rent Electrical Adjustable Desk in Bali' })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Rent Electrical Adjustable Desk in Bali' })).toBeVisible(); });
  const large = page.getByTestId('variant-option-Large (140x70cm)');
  await test.step("Check 2: expect(large).toBeEnabled()", async () => { await expect(large).toBeEnabled(); });
  await test.step("Action: large.check()", async () => { await large.check(); });
  await test.step("Check 3: expect(large).toBeChecked()", async () => { await expect(large).toBeChecked(); });
  await test.step("Check 4: expect(page.getByTestId('plan-weekly')).toBeVisible()", async () => { await expect(page.getByTestId('plan-weekly')).toBeVisible(); });
  await test.step("Check 5: expect(page.getByTestId('plan-monthly')).toBeVisible()", async () => { await expect(page.getByTestId('plan-monthly')).toBeVisible(); });
  await test.step("Action: page.getByTestId('add-to-cart').click()", async () => { await page.getByTestId('add-to-cart').click(); });
  await test.step("Action: page.getByRole('link', { name: 'Shopping cart' }).click()", async () => { await page.getByRole('link', { name: 'Shopping cart' }).click(); });
  await test.step("Check 6: expect(page.getByRole('heading', { name: 'Electrical Adjustable Desk', level: 3 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Electrical Adjustable Desk', level: 3 })).toBeVisible(); });
  await test.step("Check 7: expect(page.getByText('Variant: Large (140x70cm)', { exact: true })).toBeVisible()", async () => { await expect(page.getByText('Variant: Large (140x70cm)', { exact: true })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The large desk variant can be selected, rental options appear, and the cart shows the selected variant.', contentType: 'text/plain' });
});

test('view bundle contents and configuration options', { annotation: { type: 'description', description: "Expected: The Essentials bundle shows its included products and a size option." } }, async ({ page }) => {
  await test.step("Action: page.goto('/')", async () => { await page.goto('/'); });
  await test.step("Action: page.getByRole('region', { name: 'Bundles' }).getByRole('article') .filter({ has: page.getByRole('heading', { name: 'The Essentials', exact: true }) }) .getByRole('link', { name: 'View Bundle' }).click()", async () => { await page.getByRole('region', { name: 'Bundles' }).getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'The Essentials', exact: true }) })
    .getByRole('link', { name: 'View Bundle' }).click(); });
  await test.step("Check 1: expect(page.getByRole('heading', { name: 'The Essentials', level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'The Essentials', level: 1 })).toBeVisible(); });
  await test.step("Check 2: expect(page.getByRole('heading', { name: \"What's included\" })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: "What's included" })).toBeVisible(); });
  await test.step("Check 3: expect(page.getByRole('button', { name: /^Electrical Adjustable Desk .*View product details/ })).toBeVisible()", async () => { await expect(page.getByRole('button', { name: /^Electrical Adjustable Desk .*View product details/ })).toBeVisible(); });
  await test.step("Check 4: expect(page.getByRole('button', { name: /^Ergonomic Office Chair .*View product details/ })).toBeVisible()", async () => { await expect(page.getByRole('button', { name: /^Ergonomic Office Chair .*View product details/ })).toBeVisible(); });
  await test.step("Check 5: expect(page.getByRole('button', { name: 'Small (120x60cm)' })).toBeVisible()", async () => { await expect(page.getByRole('button', { name: 'Small (120x60cm)' })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The Essentials bundle shows its included products and a size option.', contentType: 'text/plain' });
});

test('add an item to the guest cart, retain it after reload, and clear it', { annotation: { type: 'description', description: "Expected: The chair appears in the guest cart, remains after reload, and disappears after clearing." } }, async ({ page }) => {
  const store = new StorefrontPage(page);
  await test.step("Action: store.open()", async () => { await store.open(); });
  const card = store.productCard('Furniture', chair);
  await test.step("Check 1: expect(card.getByRole('button', { name: 'Add to Cart' })).toBeEnabled()", async () => { await expect(card.getByRole('button', { name: 'Add to Cart' })).toBeEnabled(); });
  await test.step("Action: card.getByRole('button', { name: 'Add to Cart' }).click()", async () => { await card.getByRole('button', { name: 'Add to Cart' }).click(); });
  await test.step("Action: store.cartLink.click()", async () => { await store.cartLink.click(); });
  await test.step("Check 2: expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible(); });
  await test.step("Check 3: expect(page.getByRole('heading', { name: chair, level: 3 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: chair, level: 3 })).toBeVisible(); });
  await test.step("Action: page.reload()", async () => { await page.reload(); });
  await test.step("Check 4: expect(page.getByRole('heading', { name: chair, level: 3 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: chair, level: 3 })).toBeVisible(); });
  await test.step("Action: page.getByRole('button', { name: 'Clear', exact: true }).click()", async () => { await page.getByRole('button', { name: 'Clear', exact: true }).click(); });
  await test.step("Check 5: expect(page.getByRole('heading', { name: chair, level: 3 })).toHaveCount(0)", async () => { await expect(page.getByRole('heading', { name: chair, level: 3 })).toHaveCount(0); });
  await test.info().attach('Actual behavior', { body: 'Observed: The chair appears in the guest cart, remains after reload, and disappears after clearing.', contentType: 'text/plain' });
});

test('read the rental guide from the header', { annotation: { type: 'description', description: "Expected: The rental guide opens and displays browsing and rental-cycle sections." } }, async ({ page }) => {
  const store = new StorefrontPage(page);
  await test.step("Action: store.open()", async () => { await store.open(); });
  await test.step("Action: page.getByRole('link', { name: 'How it works', exact: true }).click()", async () => { await page.getByRole('link', { name: 'How it works', exact: true }).click(); });
  await test.step("Check 1: expect(page.getByRole('heading', { name: /How Renting Works/, level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: /How Renting Works/, level: 1 })).toBeVisible(); });
  await test.step("Check 2: expect(page.getByRole('heading', { name: 'Browse equipment' })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Browse equipment' })).toBeVisible(); });
  await test.step("Check 3: expect(page.getByRole('heading', { name: 'Choose rental cycle' })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Choose rental cycle' })).toBeVisible(); });
  await test.info().attach('Actual behavior', { body: 'Observed: The rental guide opens and displays browsing and rental-cycle sections.', contentType: 'text/plain' });
});

test('change display currency', { annotation: { type: 'description', description: "Expected: Choosing Indonesian Rupiah updates the displayed currency to IDR." } }, async ({ page }) => {
  const store = new StorefrontPage(page);
  await test.step("Action: store.open()", async () => { await store.open(); });
  await test.step("Action: store.currency.click()", async () => { await store.currency.click(); });
  await test.step("Action: page.getByRole('menuitem', { name: 'Indonesian Rupiah (IDR)' }).click()", async () => { await page.getByRole('menuitem', { name: 'Indonesian Rupiah (IDR)' }).click(); });
  await test.step("Check 1: expect(store.currency).toHaveText(/idr/i)", async () => { await expect(store.currency).toHaveText(/idr/i); });
  await test.info().attach('Actual behavior', { body: 'Observed: Choosing Indonesian Rupiah updates the displayed currency to IDR.', contentType: 'text/plain' });
});

test('choose another delivery city and browse its catalog', { annotation: { type: 'description', description: "Expected: Selecting Chiang Mai updates the location, catalog heading, and monitors category link." } }, async ({ page }) => {
  const store = new StorefrontPage(page);
  await test.step("Action: store.open()", async () => { await store.open(); });
  await test.step("Action: page.getByRole('button', { name: 'Location Bali' }).click()", async () => { await page.getByRole('button', { name: 'Location Bali' }).click(); });
  await test.step("Action: page.getByRole('button', { name: /Chiang Mai/ }).click()", async () => { await page.getByRole('button', { name: /Chiang Mai/ }).click(); });
  await test.step("Check 1: expect(page.getByRole('button', { name: 'Location Chiang Mai' })).toBeVisible()", async () => { await expect(page.getByRole('button', { name: 'Location Chiang Mai' })).toBeVisible(); });
  await test.step("Check 2: expect(page.getByRole('heading', { name: 'Rent monitors in Chiang Mai', level: 1 })).toBeVisible()", async () => { await expect(page.getByRole('heading', { name: 'Rent monitors in Chiang Mai', level: 1 })).toBeVisible(); });
  await test.step("Check 3: expect(store.category('Monitors')).toHaveAttribute('href', '/categories/monitors/chiang-mai')", async () => { await expect(store.category('Monitors')).toHaveAttribute('href', '/categories/monitors/chiang-mai'); });
  await test.info().attach('Actual behavior', { body: 'Observed: Selecting Chiang Mai updates the location, catalog heading, and monitors category link.', contentType: 'text/plain' });
});
