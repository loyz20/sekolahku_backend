require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin.test@sekolahku.id';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Password123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin Test';
const ADMIN_NIP = process.env.SEED_ADMIN_NIP || '199001012015011001';
const ADMIN_DUTIES = ['admin', 'guru'];

async function ensureDuty(connection, dutyCode) {
  const [rows] = await connection.execute('SELECT id FROM duties WHERE code = ? LIMIT 1', [dutyCode]);
  if (!rows.length) {
    throw new Error(`Duty "${dutyCode}" not found. Run migrations first.`);
  }
  return rows[0].id;
}

async function upsertAdminUser(connection) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (rows.length) {
    const userId = rows[0].id;
    await connection.execute(
      'UPDATE users SET name = ?, nip = ?, password = ?, role = ?, is_active = 1 WHERE id = ?',
      [ADMIN_NAME, ADMIN_NIP, hashedPassword, 'admin', userId]
    );
    return userId;
  }

  const [insertResult] = await connection.execute(
    'INSERT INTO users (name, nip, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [ADMIN_NAME, ADMIN_NIP, ADMIN_EMAIL, hashedPassword, 'admin']
  );

  return insertResult.insertId;
}

async function ensureActiveDuty(connection, userId, dutyId, note) {
  const [rows] = await connection.execute(
    'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL LIMIT 1',
    [userId, dutyId]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [insertResult] = await connection.execute(
    'INSERT INTO user_duties (user_id, duty_id, notes) VALUES (?, ?, ?)',
    [userId, dutyId, note]
  );

  return insertResult.insertId;
}

async function seedAdminTest() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    const userId = await upsertAdminUser(connection);

    for (const dutyCode of ADMIN_DUTIES) {
      const dutyId = await ensureDuty(connection, dutyCode);
      await ensureActiveDuty(connection, userId, dutyId, 'Seeded from admin test seed');
    }

    await connection.commit();

    console.log('[SEED] Admin test seed completed successfully.');
    console.log(`[SEED] user_id=${userId}`);
    console.log(`[SEED] Login email: ${ADMIN_EMAIL}`);
    console.log(`[SEED] Login password: ${ADMIN_PASSWORD}`);
    console.log(`[SEED] Active duties: ${ADMIN_DUTIES.join(', ')}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Admin test seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedAdminTest();
