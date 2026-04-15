require('dotenv').config();
const mysql = require('mysql2/promise');

const DEFAULT_SUBJECTS = [
  { code: 'MTK', name: 'Matematika', description: 'Mata pelajaran matematika' },
  { code: 'BIN', name: 'Bahasa Indonesia', description: 'Mata pelajaran bahasa Indonesia' },
  { code: 'BIG', name: 'Bahasa Inggris', description: 'Mata pelajaran bahasa Inggris' },
  { code: 'IPA', name: 'Ilmu Pengetahuan Alam', description: 'Mata pelajaran IPA' },
  { code: 'IPS', name: 'Ilmu Pengetahuan Sosial', description: 'Mata pelajaran IPS' },
  { code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', description: 'Mata pelajaran PJOK' },
];

async function upsertSubject(connection, subject) {
  const [existingRows] = await connection.execute(
    'SELECT id FROM subjects WHERE code_normalized = UPPER(TRIM(?)) LIMIT 1',
    [subject.code]
  );

  if (existingRows.length) {
    const id = existingRows[0].id;
    await connection.execute(
      'UPDATE subjects SET code = ?, name = ?, description = ?, is_active = 1 WHERE id = ?',
      [subject.code, subject.name, subject.description, id]
    );
    return { id, action: 'updated' };
  }

  const [insertResult] = await connection.execute(
    'INSERT INTO subjects (code, name, description, is_active) VALUES (?, ?, ?, 1)',
    [subject.code, subject.name, subject.description]
  );

  return { id: insertResult.insertId, action: 'created' };
}

async function seedDefaultSubjects() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    const stats = { created: 0, updated: 0 };

    for (const subject of DEFAULT_SUBJECTS) {
      const result = await upsertSubject(connection, subject);
      stats[result.action] += 1;
      console.log(`[SEED] ${result.action.toUpperCase()} subject ${subject.code} (id=${result.id})`);
    }

    await connection.commit();

    console.log('[SEED] Default subjects seed completed successfully.');
    console.log(`[SEED] Created: ${stats.created}, Updated: ${stats.updated}, Total: ${DEFAULT_SUBJECTS.length}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Default subjects seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDefaultSubjects();
