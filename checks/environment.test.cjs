const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const directory = mkdtempSync(join(tmpdir(), 'monis-env-check-'));
const reporter = join(directory, 'reporter.cjs');
writeFileSync(reporter, `module.exports = class { onBegin(config) { console.log('TARGET=' + config.projects[0].use.baseURL); console.log('USER=' + (process.env.TEST_USER_EMAIL || '(none)')); } };`);
const cli = resolve('node_modules/.bin/playwright');
function list(file, extra = {}) {
  return spawnSync(cli, ['test', '--list', `--reporter=${reporter}`], {
    encoding: 'utf8', env: { ...process.env, MONIS_ENV_FILE: file, ...extra },
  });
}

test('missing and blank selected files fail without falling back to production', () => {
  const missing = list(join(directory, 'missing.env'));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Cannot read environment file/);
  const blankFile = join(directory, 'blank.env');
  writeFileSync(blankFile, 'BASE_URL=\n');
  const blank = list(blankFile, { BASE_URL: 'https://www.monis.rent/' });
  assert.notEqual(blank.status, 0);
  assert.match(blank.stderr, /BASE_URL is required/);
});

test('selected file controls the URL and does not inherit another account', () => {
  const stagingFile = join(directory, 'staging.env');
  writeFileSync(stagingFile, 'BASE_URL=https://staging.example.test\n');
  const result = list(stagingFile, { BASE_URL: 'https://www.monis.rent/', TEST_USER_EMAIL: 'old@example.invalid' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /TARGET=https:\/\/staging\.example\.test/);
  assert.match(result.stdout, /USER=\(none\)/);
});

test('invalid URLs and embedded credentials are rejected', () => {
  const file = join(directory, 'invalid.env');
  for (const value of ['not-a-url', 'https://user:password@example.test/', 'file:///tmp/test']) {
    writeFileSync(file, `BASE_URL=${value}\n`);
    const result = list(file);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BASE_URL must be/);
  }
});
