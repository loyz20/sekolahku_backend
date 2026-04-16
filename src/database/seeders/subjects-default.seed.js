require('dotenv').config();
const mysql = require('mysql2/promise');

const DEFAULT_SUBJECTS = [
  {
    code: 'AGAMA',
    name: 'Pendidikan Agama dan Budi Pekerti',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'PPKN',
    name: 'Pendidikan Pancasila dan Kewarganegaraan',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'BINDO',
    name: 'Bahasa Indonesia',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'MTK',
    name: 'Matematika',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'SEJIND',
    name: 'Sejarah Indonesia',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'BING',
    name: 'Bahasa Inggris',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'SENI',
    name: 'Seni Budaya',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'PJOK',
    name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'PKWU',
    name: 'Prakarya dan Kewirausahaan',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'INF',
    name: 'Informatika',
    description: 'Kelompok mata pelajaran umum SMA',
  },
  {
    code: 'MTKMIN',
    name: 'Matematika Peminatan',
    description: 'Kelompok mata pelajaran peminatan MIPA SMA',
  },
  {
    code: 'FIS',
    name: 'Fisika',
    description: 'Kelompok mata pelajaran peminatan MIPA SMA',
  },
  {
    code: 'KIM',
    name: 'Kimia',
    description: 'Kelompok mata pelajaran peminatan MIPA SMA',
  },
  {
    code: 'BIO',
    name: 'Biologi',
    description: 'Kelompok mata pelajaran peminatan MIPA SMA',
  },
  {
    code: 'EKO',
    name: 'Ekonomi',
    description: 'Kelompok mata pelajaran peminatan IPS SMA',
  },
  {
    code: 'SOS',
    name: 'Sosiologi',
    description: 'Kelompok mata pelajaran peminatan IPS SMA',
  },
  {
    code: 'GEO',
    name: 'Geografi',
    description: 'Kelompok mata pelajaran peminatan IPS SMA',
  },
  {
    code: 'SEJ',
    name: 'Sejarah',
    description: 'Kelompok mata pelajaran peminatan IPS SMA',
  },
  {
    code: 'BBING',
    name: 'Bahasa dan Sastra Inggris',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
  {
    code: 'BJPG',
    name: 'Bahasa Jepang',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
  {
    code: 'BMND',
    name: 'Bahasa Mandarin',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
  {
    code: 'BPRN',
    name: 'Bahasa Prancis',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
  {
    code: 'BJRM',
    name: 'Bahasa Jerman',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
  {
    code: 'BARB',
    name: 'Bahasa Arab',
    description: 'Kelompok mata pelajaran peminatan bahasa SMA',
  },
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
