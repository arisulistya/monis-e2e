import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class ResultReporter implements Reporter {
  private readonly issues: string[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'skipped' && result.status !== 'failed' && result.status !== 'timedOut' && result.status !== 'interrupted') return;
    const reason = result.status === 'skipped'
      ? result.annotations.find(annotation => annotation.type === 'skip')?.description || 'Skipped without a reason.'
      : result.error?.message?.replace(/\u001b\[[0-9;]*m/g, '').split('\n').find(line => line.trim()) || 'See the Allure report for details.';
    const safeReason = reason.replace(/[^\s]+@[^\s]+/g, '[email]');
    this.issues.push(`${result.status.toUpperCase()}: ${test.title}\n  ${safeReason}`);
  }

  onEnd() {
    const summary = this.issues.length ? this.issues.join('\n\n') : 'No failed or skipped tests.';
    console.log(`\nFailed and skipped test summary:\n${summary}`);
    if (process.env.ALLURE_RESULTS_DIR) writeFileSync(join(dirname(process.env.ALLURE_RESULTS_DIR), 'issues.txt'), `${summary}\n`, { mode: 0o600 });
  }
}
