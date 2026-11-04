import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const report = await readFile(join(homedir(), '.monis-e2e', 'allure-runs', 'latest.txt'), 'utf8');
const result = spawnSync(resolve('node_modules', '.bin', 'allure'), ['open', report.trim()], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
