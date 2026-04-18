require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const PASSWORD = process.env.SEED_TEACHER_PASSWORD || 'Password123';
const ASSIGNED_BY = process.env.SEED_TEACHER_ASSIGNED_BY
  ? Number(process.env.SEED_TEACHER_ASSIGNED_BY)
  : null;
const NOTES = process.env.SEED_TEACHER_NOTES || 'Seeded teacher subject assignment';

const TEACHERS = [
  { name: 'Andi Pratama', nip: '198801152012031001', email: 'andi.pratama@sekolahku.id', specialization: 'Matematika' },
  { name: 'Siti Aisyah', nip: '198905102013032002', email: 'siti.aisyah@sekolahku.id', specialization: 'Bahasa Indonesia' },
  { name: 'Budi Santoso', nip: '197912202009041003', email: 'budi.santoso@sekolahku.id', specialization: 'Bahasa Inggris' },
  { name: 'Rina Kartika', nip: '198703182011042004', email: 'rina.kartika@sekolahku.id', specialization: 'IPA' },
  { name: 'Dedi Wirawan', nip: '198411072010051005', email: 'dedi.wirawan@sekolahku.id', specialization: 'IPS' },
  { name: 'Maya Lestari', nip: '198606142014062006', email: 'maya.lestari@sekolahku.id', specialization: 'Informatika' },
  { name: 'Ahmad Fauzi', nip: '198502052009071007', email: 'ahmad.fauzi@sekolahku.id', specialization: 'PJOK' },
  { name: 'Nina Sari', nip: '198908212015082008', email: 'nina.sari@sekolahku.id', specialization: 'Seni Budaya' },
  { name: 'Rudi Hartono', nip: '198301302008091009', email: 'rudi.hartono@sekolahku.id', specialization: 'Pendidikan Agama' },
  { name: 'Lina Amelia', nip: '199002112016102010', email: 'lina.amelia@sekolahku.id', specialization: 'PKN' },
  { name: 'Fajar Nugroho', nip: '198612092012112011', email: 'fajar.nugroho@sekolahku.id', specialization: 'Prakarya' },
  { name: 'Dewi Anggraini', nip: '198709172013122012', email: 'dewi.anggraini@sekolahku.id', specialization: 'Konseling' },
];

const SUBJECT_RULES = [
  { keywords: ['MATK', 'MTK', 'MATEMATIKA'], specialization: 'Matematika' },
  { keywords: ['BINDO', 'BAHASA INDONESIA'], specialization: 'Bahasa Indonesia' },
  { keywords: ['BING', 'BAHASA INGGRIS'], specialization: 'Bahasa Inggris' },
  { keywords: ['FIS'], specialization: 'IPA' },
  { keywords: ['KIM'], specialization: 'IPA' },
  { keywords: ['BIO'], specialization: 'IPA' },
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

async function ensureDuty(connection, code) {
  const rows = await fetchRows(connection, 'SELECT id FROM duties WHERE code = ? LIMIT 1', [code]);
  if (!rows.length) throw new Error(`Duty "${code}" not found. Run migrations first.`);
  return rows[0].id;
}

async function ensureGuruDuty(connection, userId, guruDutyId) {
  const rows = await fetchRows(
    connection,
    'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL LIMIT 1',
    [userId, guruDutyId]
  );

  if (rows.length) return rows[0].id;

  const [result] = await connection.execute(
    'INSERT INTO user_duties (user_id, duty_id, notes) VALUES (?, ?, ?)',
    [userId, guruDutyId, NOTES]
  );

  return result.insertId;
}

async function upsertTeacher(connection, guruDutyId, teacher) {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  const userRows = await fetchRows(connection, 'SELECT id FROM users WHERE email = ? LIMIT 1', [teacher.email]);
  let userId;

  if (userRows.length) {
    userId = userRows[0].id;
    await connection.execute(
      'UPDATE users SET name = ?, nip = ?, password = ?, role = ?, is_active = 1 WHERE id = ?',
      [teacher.name, teacher.nip, hashedPassword, 'guru', userId]
    );
  } else {
    const [insertResult] = await connection.execute(
      'INSERT INTO users (name, nip, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [teacher.name, teacher.nip, teacher.email, hashedPassword, 'guru']
    );
    userId = insertResult.insertId;
  }

  const teacherRows = await fetchRows(connection, 'SELECT id FROM teachers WHERE nip = ? LIMIT 1', [teacher.nip]);

  if (teacherRows.length) {
    const teacherId = teacherRows[0].id;
    await connection.execute(
      `UPDATE teachers
       SET name = ?, email = ?, specialization = ?, qualification = COALESCE(qualification, 'S1'), user_id = ?, is_active = 1
       WHERE id = ?`,
      [teacher.name, teacher.email, teacher.specialization, userId, teacherId]
    );
    await ensureGuruDuty(connection, userId, guruDutyId);
    return { userId, teacherId, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO teachers
     (nip, name, email, specialization, qualification, user_id, is_active)
     VALUES (?, ?, ?, ?, 'S1', ?, 1)`,
    [teacher.nip, teacher.name, teacher.email, teacher.specialization, userId]
  );

  await ensureGuruDuty(connection, userId, guruDutyId);
  return { userId, teacherId: result.insertId, created: true };
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
  const rows = await fetchRows(connection, 'SELECT id, code, name, level FROM classes ORDER BY COALESCE(level, ""), name ASC, code ASC');
  if (!rows.length) throw new Error('No classes found. Seed classes first.');
  return rows;
}

async function loadSubjects(connection) {
  const rows = await fetchRows(connection, 'SELECT id, code, name FROM subjects WHERE is_active = 1 ORDER BY code ASC, name ASC');
  if (!rows.length) throw new Error('No subjects found. Seed subjects first.');
  return rows;
}

async function loadTeachers(connection) {
  const rows = await fetchRows(connection, 'SELECT id, name, specialization FROM teachers WHERE is_active = 1 ORDER BY name ASC');
  if (!rows.length) throw new Error('No teachers found after seeding.');
  return rows;
}

async function ensureClassSubject(connection, classId, subjectId, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ? AND academic_year_id = ? AND ended_at IS NULL LIMIT 1`,
    [classId, subjectId, academicYearId]
  );

  if (rows.length) return { id: rows[0].id, created: false };

  const [result] = await connection.execute(
    `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, assigned_by, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [classId, subjectId, academicYearId, ASSIGNED_BY, NOTES]
  );

  return { id: result.insertId, created: true };
}

function pickTeacherForSubject(subject, teachers, cursor) {
  const subjectLabel = `${subject.code} ${subject.name}`.toUpperCase();

  for (const rule of SUBJECT_RULES) {
    if (rule.keywords.some((keyword) => subjectLabel.includes(keyword))) {
      const matched = teachers.filter((teacher) => {
        const specialization = String(teacher.specialization || '').toUpperCase();
        return specialization.includes(rule.specialization.toUpperCase());
      });

      if (matched.length) {
        return matched[cursor % matched.length].id;
      }
    }
  }

  return teachers[cursor % teachers.length].id;
}

async function ensureActiveTeachingAssignment(connection, classSubjectId, teacherId) {
  const rows = await fetchRows(
    connection,
    `SELECT id FROM teaching_assignments WHERE class_subject_id = ? AND ended_at IS NULL LIMIT 1`,
    [classSubjectId]
  );

  if (rows.length) {
    const [existingAssignmentRows] = await connection.execute(
      `SELECT id FROM teaching_assignments WHERE class_subject_id = ? AND teacher_id = ? LIMIT 1`,
      [classSubjectId, teacherId]
    );

    if (existingAssignmentRows.length) {
      return { id: existingAssignmentRows[0].id, created: false };
    }

    return { id: rows[0].id, created: false };
  }

  const [result] = await connection.execute(
    `INSERT INTO teaching_assignments (class_subject_id, teacher_id, assigned_by, notes)
     VALUES (?, ?, ?, ?)`,
    [classSubjectId, teacherId, ASSIGNED_BY, NOTES]
  );

  return { id: result.insertId, created: true };
}

async function seedTeachersAndSubjects() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    const guruDutyId = await ensureDuty(connection, 'guru');
    const academicYear = await getTargetAcademicYear(connection);
    const classes = await loadClasses(connection);
    const subjects = await loadSubjects(connection);

    const teacherResults = [];
    for (const teacher of TEACHERS) {
      teacherResults.push(await upsertTeacher(connection, guruDutyId, teacher));
    }

    const teachers = await loadTeachers(connection);
    const stats = {
      teachersCreated: teacherResults.filter((item) => item.created).length,
      teachersUpdated: teacherResults.filter((item) => !item.created).length,
      classSubjectsCreated: 0,
      assignmentsCreated: 0,
      assignmentsSkipped: 0,
    };

    let teacherCursor = 0;

    for (const cls of classes) {
      for (const subject of subjects) {
        const classSubject = await ensureClassSubject(connection, cls.id, subject.id, academicYear.id);
        if (classSubject.created) stats.classSubjectsCreated += 1;

        const teacherId = pickTeacherForSubject(subject, teachers, teacherCursor);
        teacherCursor += 1;

        const assignmentRows = await fetchRows(
          connection,
          'SELECT id, teacher_id, ended_at FROM teaching_assignments WHERE class_subject_id = ? ORDER BY ended_at IS NULL DESC, id DESC LIMIT 1',
          [classSubject.id]
        );

        if (assignmentRows.length && assignmentRows[0].ended_at === null) {
          stats.assignmentsSkipped += 1;
          continue;
        }

        const activeRows = await fetchRows(
          connection,
          'SELECT id FROM teaching_assignments WHERE class_subject_id = ? AND ended_at IS NULL LIMIT 1',
          [classSubject.id]
        );

        if (activeRows.length) {
          stats.assignmentsSkipped += 1;
          continue;
        }

        const assignment = await ensureActiveTeachingAssignment(connection, classSubject.id, teacherId);
        if (assignment.created) stats.assignmentsCreated += 1;
      }
    }

    await connection.commit();

    console.log('[SEED] Teachers + subject assignments completed successfully.');
    console.log(`[SEED] Academic year: ${academicYear.code} (id=${academicYear.id})`);
    console.log(`[SEED] Teachers created: ${stats.teachersCreated}, updated: ${stats.teachersUpdated}`);
    console.log(`[SEED] Class subjects created: ${stats.classSubjectsCreated}`);
    console.log(`[SEED] Teaching assignments created: ${stats.assignmentsCreated}`);
    console.log(`[SEED] Teaching assignments skipped: ${stats.assignmentsSkipped}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Teachers + subject assignments seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedTeachersAndSubjects();