import { appendFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function newSignupAccount() {
  if (process.env.RUN_PRODUCTION_MUTATIONS !== '1') return undefined;
  const email = `monis${randomUUID().replaceAll('-', '')}@mailinator.com`;
  const password = randomUUID();
  const directory = join(homedir(), '.monis-e2e', '.local');
  await mkdir(directory, { recursive: true });
  const target = process.env.BASE_URL ? new URL(process.env.BASE_URL).origin : 'unknown';
  await appendFile(join(directory, 'accounts-to-clean.txt'), `${new Date().toISOString()} ${target} ${email}\n`, { mode: 0o600 });
  return { email, password };
}
