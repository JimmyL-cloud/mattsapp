import { access } from 'node:fs/promises';
import postgres from 'postgres';

const requiredPaths = [
  'package.json',
  'src/app/login/page.tsx',
  'src/lib/auth/config.ts',
  'src/lib/db/schema/core.ts',
  'drizzle.config.ts',
  'scripts/seed.mjs',
];

for (const path of requiredPaths) await access(path);
console.log(`Source verification: ${requiredPaths.length} required paths present`);

if (process.env.DATABASE_URL) {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });
  try {
    const [summary] = await sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from auth_accounts) as auth_accounts,
        (select count(*)::int from normalized_market_records where is_demo = false) as real_market_records,
        (select count(*)::int from normalized_market_records where is_demo = true) as demo_market_records
    `;
    if (summary.users !== 1 || summary.auth_accounts !== 1) throw new Error('Expected exactly one test user and one auth account');
    if (summary.real_market_records !== 0) throw new Error('Fresh test database contains real market records');
    console.log(`Database verification: one test account, zero real market records, ${summary.demo_market_records} demo records`);
  }
  finally {
    await sql.end();
  }
}
