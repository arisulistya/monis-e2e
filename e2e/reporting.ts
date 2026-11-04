import type { TestInfo } from '@playwright/test';

export async function reportIncomplete({}: object, testInfo: TestInfo): Promise<void> {
  if (testInfo.status === 'passed') return;
  const actual = testInfo.status === 'skipped'
    ? 'The scenario was skipped; actual behavior was not observed. See the skip reason.'
    : 'The scenario did not complete; actual behavior was not fully verified. See the failed step and error.';
  await testInfo.attach('Actual behavior', { body: actual, contentType: 'text/plain' });
}
