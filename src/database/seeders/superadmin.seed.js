require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@sekolahku.id';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

const SUPERADMIN_DUTIES = ['superadmin', 'admin', 'guru'];

async function seedSuperadmin() {
  if (!SUPERADMIN_PASSWORD) {
    console.error(
      '[SEED] SUPERADMIN_PASSWORD is not set in .env. Please add it before running this seed.'
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    // Upsert superadmin user.
    const [existingRows] = await connection.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [SUPERADMIN_EMAIL]
    );

    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    let superadminId;

    if (existingRows.length) {
      superadminId = existingRows[0].id;

      // Update password and ensure protection flags are set.
      await connection.execute(
        'UPDATE users SET password = ?, name = ?, is_protected = 1, is_active = 1 WHERE id = ?',
        [hashedPassword, SUPERADMIN_NAME, superadminId]
      );

      console.log(`[SEED] Superadmin account updated (id=${superadminId})`);
    } else {
      const [insertResult] = await connection.execute(
        "INSERT INTO users (name, email, password, role, is_active, is_protected) VALUES (?, ?, ?, 'admin', 1, 1)",
        [SUPERADMIN_NAME, SUPERADMIN_EMAIL, hashedPassword]
      );

      superadminId = insertResult.insertId;
      console.log(`[SEED] Superadmin account created (id=${superadminId})`);
    }

    // Assign all superadmin duties (idempotent: skip existing active duties).
    for (const dutyCode of SUPERADMIN_DUTIES) {
      const [dutyRows] = await connection.execute(
        'SELECT id FROM duties WHERE code = ? LIMIT 1',
        [dutyCode]
      );

      if (!dutyRows.length) {
        console.warn(`[SEED] Duty "${dutyCode}" not found in master table, skipping.`);
        continue;
      }

      const dutyId = dutyRows[0].id;

      const [activeRows] = await connection.execute(
        'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL LIMIT 1',
        [superadminId, dutyId]
      );

      if (activeRows.length) {
        console.log(`[SEED]   Duty "${dutyCode}" already active, skipped.`);
        continue;
      }

      await connection.execute(
        "INSERT INTO user_duties (user_id, duty_id, notes) VALUES (?, ?, 'Seeded from superadmin seed')",
        [superadminId, dutyId]
      );

      console.log(`[SEED]   Duty "${dutyCode}" assigned.`);
    }

    await connection.commit();
    console.log('[SEED] Superadmin seed completed successfully.');
    console.log(`[SEED] Login email : ${SUPERADMIN_EMAIL}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedSuperadmin();
