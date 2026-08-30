import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { hashPassword } from 'better-auth/crypto';

function required(name, minimum = 1) {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimum) {
    throw new Error(`${name} is required${minimum > 1 ? ` and must contain at least ${minimum} characters` : ''}`);
  }
  return value;
}

const databaseUrl = required('DATABASE_URL');
const email = required('MATTSAPP_OWNER_EMAIL').toLowerCase();
const password = required('MATTSAPP_OWNER_PASSWORD', 12);
const name = process.env.MATTSAPP_OWNER_NAME?.trim() || 'Matt';
const sql = postgres(databaseUrl, { max: 1, ssl: 'require' });

try {
  const passwordHash = await hashPassword(password);
  await sql.begin(async (transaction) => {
    const existing = await transaction`select id from users where email = ${email} limit 1`;
    const userId = existing[0]?.id ?? randomUUID();
    await transaction`
      insert into users (id, name, email, email_verified, display_name)
      values (${userId}, ${name}, ${email}, true, ${name})
      on conflict (email) do update set
        name = excluded.name,
        display_name = excluded.display_name,
        updated_at = now()
    `;
    await transaction`
      insert into auth_accounts (id, user_id, account_id, provider_id, password)
      values (${randomUUID()}, ${userId}, ${userId}, 'credential', ${passwordHash})
      on conflict (provider_id, account_id) do update set
        password = excluded.password,
        updated_at = now()
    `;
  });
  console.log(`Owner account ready: ${email}`);
}
finally {
  await sql.end();
}
