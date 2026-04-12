/**
 * One-time admin user seed script.
 * Run: node -e "require('./dist/seed-admin').seedAdmin()"
 * Or via ts-node: npx ts-node -r tsconfig-paths/register src/seed-admin.ts
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from env (or uses defaults).
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seedAdmin() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5434),
    username: process.env.DATABASE_USER ?? 'cr_user',
    password: process.env.DATABASE_PASSWORD ?? 'cr_dev_pass',
    database: process.env.DATABASE_NAME ?? 'community_ride',
    ssl: false,
  });

  await ds.initialize();

  const email = process.env.ADMIN_EMAIL ?? 'admin@communityride.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  // Check if admin already exists
  const existing = await ds.query(
    `SELECT id, role FROM users WHERE email = $1`, [email]
  );

  if (existing.length > 0) {
    if (existing[0].role === 'admin') {
      console.log(`✅ Admin already exists: ${email}`);
    } else {
      // Upgrade existing user to admin
      await ds.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
      console.log(`✅ Upgraded ${email} to admin role.`);
    }
  } else {
    const hash = await bcrypt.hash(password, 12);
    await ds.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')`,
      [name, email, '0000000000', hash]
    );
    console.log(`✅ Admin created: ${email} / ${password}`);
  }

  await ds.destroy();
}

seedAdmin().catch(e => { console.error(e); process.exit(1); });
