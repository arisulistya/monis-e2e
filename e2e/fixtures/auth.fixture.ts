import { test as base, expect } from './staging.fixture';
import { AuthPage } from '../pages/auth.page';

type Fixtures = { auth: AuthPage };
export const test = base.extend<Fixtures>({
  auth: async ({ page }, use) => { await use(new AuthPage(page)); },
});
export { expect };
