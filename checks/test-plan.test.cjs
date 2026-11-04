const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const directory = mkdtempSync(join(tmpdir(), 'monis-plan-check-'));
const environment = join(directory, 'environment');
writeFileSync(environment, 'BASE_URL=https://example.test\n');
const valid = 'auth/login.spec.ts > opens login and requires email and password';
const run = (file) => spawnSync(process.execPath, [resolve('scripts/check-plan.mjs'), file], { encoding: 'utf8', env: { ...process.env, MONIS_ENV_FILE: environment } });

test('accepts valid test selections and comments', () => {
  const file = join(directory, 'valid.txt');
  writeFileSync(file, `# comment\n${valid}\n`);
  const result = run(file);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated 1/);
});

test('reports all duplicate and unmatched entries', () => {
  const file = join(directory, 'invalid.txt');
  writeFileSync(file, `${valid}\n${valid}\nauth/login.spec.ts > unknown test one\nauth/login.spec.ts > unknown test two\n`);
  const result = run(file);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate test-list entry/);
  assert.match(result.stderr, /unknown test one/);
  assert.match(result.stderr, /unknown test two/);
});

test('rejects empty and missing plans', () => {
  const file = join(directory, 'empty.txt');
  writeFileSync(file, '# nothing selected\n');
  assert.notEqual(run(file).status, 0);
  assert.notEqual(run(join(directory, 'missing.txt')).status, 0);
});

test('planned execution rejects invalid entries before creating a run', () => {
  const file = join(directory, 'invalid-run.txt');
  writeFileSync(file, 'auth/login.spec.ts > missing test\n');
  const result = spawnSync(process.execPath, [resolve('scripts/run.mjs'), 'test', `--test-list=${file}`], { encoding: 'utf8', env: { ...process.env, MONIS_ENV_FILE: environment } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown test-list entry/);
  assert.doesNotMatch(result.stdout, /Allure report:/);
});

test('planned execution rejects extra test filters', () => {
  const file = join(directory, 'valid-filter.txt');
  writeFileSync(file, `${valid}\n`);
  for (const filter of ['--grep=login', 'auth/login.spec.ts', '--config=other.ts']) {
    const result = spawnSync(process.execPath, [resolve('scripts/run.mjs'), 'test', `--test-list=${file}`, filter], { encoding: 'utf8', env: { ...process.env, MONIS_ENV_FILE: environment } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Cannot combine/);
  }
});
