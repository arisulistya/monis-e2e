import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { checkPlan } from './check-plan.mjs';

const [mode, ...options] = process.argv.slice(2);
if (!['test', 'regression', 'headed', 'debug'].includes(mode)) throw new Error('Expected test, regression, headed, or debug mode');
const keepOpen = options.includes('--keep-open');
if (keepOpen && !['headed', 'debug'].includes(mode)) throw new Error('--keep-open requires test:headed or test:debug.');
const extra = options.filter(option => option !== '--keep-open');
const listOptions = extra.flatMap((arg, index) => arg === '--test-list' ? [extra[index + 1]] : arg.startsWith('--test-list=') ? [arg.slice('--test-list='.length)] : []);
if (listOptions.length > 1 || listOptions.some(value => !value || value.startsWith('--'))) throw new Error('Provide one test-list file.');
if (listOptions.length) {
  const conflicting = extra.find(arg => /^(?:--grep(?:-invert)?|--test-list-invert|--project|--shard|--only-changed|--last-failed(?:-file)?|--repeat-each|--pass-with-no-tests|--config)(?:=|$)|^-[gGc]/.test(arg));
  if (conflicting) throw new Error(`Cannot combine ${conflicting} with a validated test list; edit the list instead.`);
  const valueOptions = new Set(['--test-list', '--workers', '-j', '--timeout', '--retries', '--max-failures', '--reporter', '--output']);
  for (let i = 0; i < extra.length; i++) {
    if (valueOptions.has(extra[i])) { i++; continue; }
    if (!extra[i].startsWith('-') || extra[i] === '--') throw new Error('Cannot combine positional filters with a validated test list; edit the list instead.');
  }
  await checkPlan(listOptions[0]);
}
const root = join(homedir(), '.monis-e2e', 'allure-runs');
const run = join(root, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
const results = join(run, 'results');
const report = join(run, 'report');
await mkdir(results, { recursive: true });
const cli = resolve('node_modules', '.bin', 'playwright');
const args = ['test', ...(mode === 'debug' ? ['--debug', '--workers=1'] : mode === 'headed' ? ['--headed', '--workers=1'] : []), ...extra];
const test = spawnSync(cli, args, { stdio: 'inherit', env: { ...process.env, ALLURE_RESULTS_DIR: results, MONIS_HEADED: mode === 'headed' || mode === 'debug' ? '1' : '0', MONIS_KEEP_OPEN: keepOpen ? '1' : '0', MONIS_TEST_PLAN: listOptions[0] || (mode === 'regression' ? 'Regression (full suite)' : '') } });
if (test.error) throw test.error;
const allure = spawnSync(resolve('node_modules', '.bin', 'allure'), ['generate', results, '-o', report], { stdio: 'inherit' });
if (allure.error) throw allure.error;
if (allure.status !== 0) process.exit(allure.status || 1);
await writeFile(join(root, 'latest.txt'), report, { mode: 0o600 });
console.log(`Allure report: ${report}`);
process.exit(test.status ?? 1);
