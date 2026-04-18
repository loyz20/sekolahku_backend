require('dotenv').config();
const mysql = require('mysql2/promise');

const NOTES = process.env.SEED_TEACHING_ASSIGNMENT_NOTES || 'Seeded teaching assignment';
const ASSIGNED_BY = process.env.SEED_TEACHING_ASSIGNMENT_ASSIGNED_BY
  ? Number(process.env.SEED_TEACHING_ASSIGNMENT_ASSIGNED_BY)
  : null;

const SUBJECT_RULES = [
  { keywords: ['MATK', 'MTK', 'MATEMATIKA'], specialization: 'Matematika' },
  { keywords: ['BINDO', 'BAHASA INDONESIA'], specialization: 'Bahasa Indonesia' },
  { keywords: ['BING', 'BAHASA INGGRIS'], specialization: 'Bahasa Inggris' },
  { keywords: ['FIS', 'KIM', 'BIO'], specialization: 'IPA' },
  { keywords: ['INF', 'INFORMATIKA', 'TIK'], specialization: 'Informatika' },
  { keywords: ['PJOK'], specialization: 'PJOK' },
  { keywords: ['SENI'], specialization: 'Seni Budaya' },
  { keywords: ['AGAMA'], specialization: 'Pendidikan Agama' },
  { keywords: ['PPKN'], specialization: 'PKN' },
  { keywords: ['PKWU'], specialization: 'Prakarya' },
  { keywords: ['EKO', 'SOS', 'GEO', 'SEJ'], specialization: 'IPS' },
  { keywords: ['BBING', 'BJPG', 'BMND', 'BPRN', 'BJRM', 'BARB'], specialization: 'Bahasa Inggris' },
];

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

async function loadClassSubjects(connection, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT cs.id, cs.class_id, cs.subject_id, c.code AS class_code, c.name AS class_name,
            s.code AS subject_code, s.name AS subject_name
     FROM class_subjects cs
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     WHERE cs.academic_year_id = ? AND cs.ended_at IS NULL
     ORDER BY COALESCE(c.level, ''), c.name ASC, s.name ASC`,
    [academicYearId]
  );

  if (!rows.length) {
    throw new Error('No active class subjects found. Run the class-subject seed first.');
  }

  return rows;
}

async function loadTeachers(connection) {
  const rows = await fetchRows(
    connection,
    'SELECT id, name, specialization FROM teachers WHERE is_active = 1 ORDER BY name ASC'
  );

  if (!rows.length) {
    throw new Error('No active teachers found. Seed teachers first.');
  }

  return rows;
}

function pickTeacher(classSubject, teachers, cursor) {
  const subjectLabel = `${classSubject.subject_code} ${classSubject.subject_name}`.toUpperCase();

  for (const rule of SUBJECT_RULES) {
    if (!rule.keywords.some((keyword) => subjectLabel.includes(keyword))) {
      continue;
    }

    const matched = teachers.filter((teacher) => {
      const specialization = String(teacher.specialization || '').toUpperCase();
      return specialization.includes(rule.specialization.toUpperCase());
    });

    if (matched.length) {
      return matched[cursor % matched.length].id;
    }
  }

  return teachers[cursor % teachers.length].id;
}

async function ensureActiveAssignment(connection, classSubjectId, teacherId) {
  const rows = await fetchRows(
    connection,
    'SELECT id, teacher_id FROM teaching_assignments WHERE class_subject_id = ? AND ended_at IS NULL LIMIT 1',
    [classSubjectId]
  );

  if (rows.length) {
    return { created: false, active: true, id: rows[0].id, teacherId: rows[0].teacher_id };
  }

  const [result] = await connection.execute(
    `INSERT INTO teaching_assignments (class_subject_id, teacher_id, assigned_by, notes)
     VALUES (?, ?, ?, ?)`,
    [classSubjectId, teacherId, ASSIGNED_BY, NOTES]
  );

  return { created: true, active: true, id: result.insertId, teacherId };
}

async function seedTeachingAssignments() {
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
    const classSubjects = await loadClassSubjects(connection, academicYear.id);
    const teachers = await loadTeachers(connection);

    const stats = {
      created: 0,
      skipped: 0,
      updated: 0,
    };

    let cursor = 0;

    for (const classSubject of classSubjects) {
      const teacherId = pickTeacher(classSubject, teachers, cursor);
      cursor += 1;

      const result = await ensureActiveAssignment(connection, classSubject.id, teacherId);
      if (result.created) {
        stats.created += 1;
      } else {
        stats.skipped += 1;
      }
    }

    await connection.commit();

    console.log('[SEED] Teaching assignment seed completed successfully.');
    console.log(`[SEED] Academic year: ${academicYear.code} (id=${academicYear.id})`);
    console.log(`[SEED] Class subjects processed: ${classSubjects.length}`);
    console.log(`[SEED] Assignments created: ${stats.created}`);
    console.log(`[SEED] Existing active assignments skipped: ${stats.skipped}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Teaching assignment seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedTeachingAssignments();