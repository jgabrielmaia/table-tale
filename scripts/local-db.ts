/**
 * Local Supabase for development: Postgres, Auth, Storage and the API run in Docker on this machine, so `npm run dev`
 * never touches production data.
 *
 *   npm run db:start   # start the stack, apply migrations, create the dev account, seed, write .env.development.local
 *   npm run db:reset   # wipe the local database, re-apply every migration and seed again
 *   npm run db:stop    # stop the containers (data is kept until the next reset)
 *
 * Needs Docker running. `.env.development.local` is only read by `vite` in dev mode, so builds and deploys keep
 * using `.env` (production).
 */
import { execSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ENV_FILE = '.env.development.local';
const DEV_EMAIL = 'dev@table-tale.local';
const DEV_NAME = 'Dev';
const CLI = ['--yes', 'supabase@latest'];
/** npx is a .cmd shim on Windows, which needs a shell; the arguments here are fixed strings, never user input. */
const npx = (args: string[]) => ['npx', ...args].join(' ');

const run = (args: string[], env: NodeJS.ProcessEnv = {}) => {
  const result = spawnSync(npx(args), { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

/** API URL and keys of the running local stack, from `supabase status -o env`. */
function status() {
  const out = execSync(npx([...CLI, 'status', '-o', 'env']), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const vars = Object.fromEntries(
    out.split(/\r?\n/).map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line)).filter((m) => m !== null).map((m) => [m[1], m[2]]),
  );
  const url = vars.API_URL;
  const anon = vars.ANON_KEY ?? vars.PUBLISHABLE_KEY;
  const service = vars.SERVICE_ROLE_KEY ?? vars.SECRET_KEY;
  if (!url || !anon || !service) throw new Error(`Unexpected \`supabase status\` output:\n${out}`);
  return { url, anon, service };
}

/** The dev account password: kept across runs so an open browser session survives a restart. */
function devPassword() {
  if (existsSync(ENV_FILE)) {
    const found = /^VITE_LOCAL_AUTH_BYPASS_PASSWORD=(.+)$/m.exec(readFileSync(ENV_FILE, 'utf8'));
    if (found?.[1]) return found[1].trim();
  }
  return randomBytes(18).toString('base64url');
}

async function ensureDevAccount(url: string, service: string, password: string) {
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.admin.listUsers();
  if (error) throw error;
  let user = data.users.find((u) => u.email === DEV_EMAIL);
  if (user) {
    const updated = await db.auth.admin.updateUserById(user.id, { password });
    if (updated.error) throw updated.error;
  } else {
    const created = await db.auth.admin.createUser({ email: DEV_EMAIL, password, email_confirm: true, user_metadata: { full_name: DEV_NAME } });
    if (created.error) throw created.error;
    user = created.data.user;
  }
  const named = await db.from('profiles').update({ display_name: DEV_NAME }).eq('id', user.id);
  if (named.error) throw named.error;
  console.log(`✓ Dev account ${DEV_EMAIL}`);
}

function writeEnv(url: string, anon: string, password: string) {
  writeFileSync(
    ENV_FILE,
    [
      '# Written by `npm run db:start` / `db:reset` (scripts/local-db.ts). Dev mode only: points the app at the local',
      '# Supabase in Docker and signs in as the local dev account. Delete this file to develop against .env again.',
      `VITE_SUPABASE_URL=${url}`,
      `VITE_SUPABASE_ANON_KEY=${anon}`,
      'VITE_LOCAL_AUTH_BYPASS=true',
      `VITE_LOCAL_AUTH_BYPASS_EMAIL=${DEV_EMAIL}`,
      `VITE_LOCAL_AUTH_BYPASS_PASSWORD=${password}`,
      '',
    ].join('\n'),
  );
  console.log(`✓ ${ENV_FILE} → ${url}`);
}

async function prepare() {
  const { url, anon, service } = status();
  const password = devPassword();
  await ensureDevAccount(url, service, password);
  // The seeds read SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment first (dotenv never overrides it),
  // so these point them at the local stack instead of the production values in .env.
  const local = { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: service, OWNER_EMAIL: DEV_EMAIL };
  run(['tsx', 'scripts/seed.ts'], local);
  run(['tsx', 'scripts/seed-communities.ts', DEV_NAME], local);
  writeEnv(url, anon, password);
  console.log('\nLocal database ready. Run `npm run dev` and the app signs in as the dev account.');
}

const command = process.argv[2];
if (command === 'start') {
  run([...CLI, 'start']);
  await prepare();
} else if (command === 'reset') {
  run([...CLI, 'db', 'reset']);
  await prepare();
} else if (command === 'stop') {
  run([...CLI, 'stop']);
} else {
  console.error('Usage: tsx scripts/local-db.ts <start|reset|stop>');
  process.exit(1);
}
