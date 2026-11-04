import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export async function checkPlan(file) {
  const text = await readFile(file, 'utf8');
  const entries = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!entries.length) throw new Error(`Test list is empty: ${file}`);
  const seen = new Set();
  const problems = [];
  for (const entry of entries) {
    if (!/^[^>›]+\.spec\.ts\s+[>›]\s+\S/.test(entry)) { problems.push(`Expected an exact test entry (file.spec.ts > test title): ${entry}`); continue; }
    const normalized = entry.split(/[>›]/).map(part => part.trim()).join(' > ');
    if (seen.has(normalized)) problems.push(`Duplicate test-list entry: ${entry}`);
    seen.add(normalized);
  }
  const discovery = spawnSync(resolve('node_modules', '.bin', 'playwright'), ['test', '--list', '--reporter=json'], { encoding: 'utf8' });
  if (discovery.error) throw discovery.error;
  if (discovery.status !== 0) throw new Error(`Playwright discovery failed: ${discovery.stderr || discovery.stdout}`);
  const discovered = JSON.parse(discovery.stdout);
  const counts = new Map();
  function visit(suite, groups = []) {
    for (const spec of suite.specs || []) {
      const key = [spec.file, ...groups, spec.title].join(' > ');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const child of suite.suites || []) visit(child, child.file === suite.file ? [...groups, child.title] : groups);
  }
  for (const suite of discovered.suites || []) visit(suite);
  for (const entry of seen) {
    const count = counts.get(entry) || 0;
    if (count !== 1) problems.push(`${count ? 'Ambiguous' : 'Unknown'} test-list entry: ${entry}`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
  console.log(`Validated ${seen.size} test-list entries in ${file}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) { console.error('Usage: node scripts/check-plan.mjs <test-list-file>'); process.exitCode = 1; }
  else checkPlan(file).catch(error => { console.error(error.message); process.exitCode = 1; });
}
