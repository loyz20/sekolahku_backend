require('dotenv').config();
const mysql = require('mysql2/promise');

const NOTES = process.env.SEED_CLASS_SUBJECT_NOTES || 'Seeded class subject mapping';
const ASSIGNED_BY = process.env.SEED_CLASS_SUBJECT_ASSIGNED_BY
  ? Number(process.env.SEED_CLASS_SUBJECT_ASSIGNED_BY)
  : null;

async function fetchRows(connection, sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

async function getTargetAcademicYear(connection) {
  if (process.env.SEED_ACADEMIC_YEAR_ID) {
    const academicYearId = Number(process.env.SEED_ACADEMIC_YEAR_ID);
    const rows = await fetchRows(
      connection,
      'SELECT id, code, name FROM academic_years WHERE id = ? LIMIT 1',
      [academicYearId]
    );

    if (!rows.length) {
      throw new Error(`Academic year with id ${academicYearId} not found.`);
    }

    return rows[0];
  }

  let rows = await fetchRows(
    connection,
    'SELECT id, code, name FROM academic_years WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  );

  if (!rows.length) {
    rows = await fetchRows(connection, 'SELECT id, code, name FROM academic_years ORDER BY id DESC LIMIT 1');
  }

  if (!rows.length) {
    throw new Error('No academic year found. Seed academic years first.');
  }

  return rows[0];
}

async function loadClasses(connection) {
  const rows = await fetchRows(
    connection,
    'SELECT id, code, name, level FROM classes ORDER BY COALESCE(level, ""), name ASC, code ASC'
  );

  if (!rows.length) {
    throw new Error('No classes found. Seed classes first.');
  }

  return rows;
}

async function loadSubjects(connection) {
  let rows = await fetchRows(
    connection,
    'SELECT id, code, name FROM subjects WHERE is_active = 1 ORDER BY code ASC, name ASC'
  );

  if (!rows.length) {
    rows = await fetchRows(connection, 'SELECT id, code, name FROM subjects ORDER BY code ASC, name ASC');
  }

  if (!rows.length) {
    throw new Error('No subjects found. Seed subjects first.');
  }

  return rows;
}

async function ensureClassSubject(connection, classId, subjectId, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT id FROM class_subjects
     WHERE class_id = ? AND subject_id = ? AND academic_year_id = ? AND ended_at IS NULL
     LIMIT 1`,
    [classId, subjectId, academicYearId]
  );

  if (rows.length) {
    return { id: rows[0].id, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, assigned_by, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [classId, subjectId, academicYearId, ASSIGNED_BY, NOTES]
  );

  return { id: result.insertId, created: true };
}

async function seedClassSubjects() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    const academicYear = await getTargetAcademicYear(connection);
    const classes = await loadClasses(connection);
    const subjects = await loadSubjects(connection);

    const stats = {
      created: 0,
      skipped: 0,
    };

    for (const cls of classes) {
      for (const subject of subjects) {
        const result = await ensureClassSubject(connection, cls.id, subject.id, academicYear.id);
        if (result.created) {
          stats.created += 1;
        } else {
          stats.skipped += 1;
        }
      }
    }

    await connection.commit();

    console.log('[SEED] Class-subject seed completed successfully.');
    console.log(`[SEED] Academic year: ${academicYear.code} (id=${academicYear.id})`);
    console.log(`[SEED] Classes processed: ${classes.length}`);
    console.log(`[SEED] Subjects processed: ${subjects.length}`);
    console.log(`[SEED] Class subjects created: ${stats.created}`);
    console.log(`[SEED] Class subjects skipped: ${stats.skipped}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Class-subject seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedClassSubjects();