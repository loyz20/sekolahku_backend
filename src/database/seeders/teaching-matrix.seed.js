require('dotenv').config();
const mysql = require('mysql2/promise');

const NOTES = process.env.SEED_TEACHING_MATRIX_NOTES || 'Seeded teaching matrix';
const ASSIGNED_BY = process.env.SEED_TEACHING_MATRIX_ASSIGNED_BY
  ? Number(process.env.SEED_TEACHING_MATRIX_ASSIGNED_BY)
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
    rows = await fetchRows(
      connection,
      'SELECT id, code, name FROM academic_years ORDER BY id DESC LIMIT 1'
    );
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
    rows = await fetchRows(
      connection,
      'SELECT id, code, name FROM subjects ORDER BY code ASC, name ASC'
    );
  }

  if (!rows.length) {
    throw new Error('No subjects found. Seed subjects first.');
  }

  return rows;
}

async function loadTeachers(connection) {
  let rows = await fetchRows(
    connection,
    'SELECT id, name, nip FROM teachers WHERE is_active = 1 ORDER BY name ASC, nip ASC'
  );

  if (!rows.length) {
    rows = await fetchRows(
      connection,
      'SELECT id, name, nip FROM teachers ORDER BY name ASC, nip ASC'
    );
  }

  if (!rows.length) {
    throw new Error('No teachers found. Seed teachers first.');
  }

  return rows;
}

async function loadExistingClassSubjects(connection, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT id, class_id, subject_id
     FROM class_subjects
     WHERE academic_year_id = ?`,
    [academicYearId]
  );

  const byKey = new Map();
  for (const row of rows) {
    byKey.set(`${row.class_id}:${row.subject_id}`, row.id);
  }

  return byKey;
}

async function loadExistingAssignments(connection, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT ta.class_subject_id, ta.teacher_id, ta.ended_at
     FROM teaching_assignments ta
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     WHERE cs.academic_year_id = ?`,
    [academicYearId]
  );

  const pairSet = new Set();
  const activeTeacherByClassSubject = new Map();

  for (const row of rows) {
    pairSet.add(`${row.class_subject_id}:${row.teacher_id}`);
    if (row.ended_at === null && !activeTeacherByClassSubject.has(row.class_subject_id)) {
      activeTeacherByClassSubject.set(row.class_subject_id, row.teacher_id);
    }
  }

  return { pairSet, activeTeacherByClassSubject };
}

async function ensureClassSubject(connection, classId, subjectId, academicYearId, createdBy) {
  const existingRows = await fetchRows(
    connection,
    `SELECT id FROM class_subjects
     WHERE class_id = ? AND subject_id = ? AND academic_year_id = ? AND ended_at IS NULL
     LIMIT 1`,
    [classId, subjectId, academicYearId]
  );

  if (existingRows.length) {
    return { id: existingRows[0].id, created: false };
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, assigned_by, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [classId, subjectId, academicYearId, createdBy, NOTES]
  );

  return { id: insertResult.insertId, created: true };
}

async function ensureTeachingAssignment(connection, classSubjectId, teacherId, isActive) {
  const existingRows = await fetchRows(
    connection,
    `SELECT id FROM teaching_assignments
     WHERE class_subject_id = ? AND teacher_id = ?
     LIMIT 1`,
    [classSubjectId, teacherId]
  );

  if (existingRows.length) {
    return { id: existingRows[0].id, created: false };
  }

  if (isActive) {
    const [insertResult] = await connection.execute(
      `INSERT INTO teaching_assignments (class_subject_id, teacher_id, assigned_by, notes)
       VALUES (?, ?, ?, ?)`,
      [classSubjectId, teacherId, ASSIGNED_BY, NOTES]
    );

    return { id: insertResult.insertId, created: true, active: true };
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO teaching_assignments (class_subject_id, teacher_id, assigned_by, ended_at, notes)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    [classSubjectId, teacherId, ASSIGNED_BY, NOTES]
  );

  return { id: insertResult.insertId, created: true, active: false };
}

async function seedTeachingMatrix() {
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
    const teachers = await loadTeachers(connection);

    const existingClassSubjects = await loadExistingClassSubjects(connection, academicYear.id);
    const existingAssignments = await loadExistingAssignments(connection, academicYear.id);

    const stats = {
      classSubjectsCreated: 0,
      classSubjectsSkipped: 0,
      assignmentsCreated: 0,
      assignmentsSkipped: 0,
      activeAssignmentsCreated: 0,
    };

    let teacherCursor = 0;

    for (const [classIndex, cls] of classes.entries()) {
      for (const [subjectIndex, subject] of subjects.entries()) {
        const classSubjectKey = `${cls.id}:${subject.id}`;
        let classSubjectId = existingClassSubjects.get(classSubjectKey);

        if (!classSubjectId) {
          const created = await ensureClassSubject(
            connection,
            cls.id,
            subject.id,
            academicYear.id,
            ASSIGNED_BY
          );
          classSubjectId = created.id;
          existingClassSubjects.set(classSubjectKey, classSubjectId);
          if (created.created) {
            stats.classSubjectsCreated += 1;
          }
        } else {
          stats.classSubjectsSkipped += 1;
        }

        const activeTeacherId = teachers[teacherCursor % teachers.length].id;
        teacherCursor += 1;

        if (!existingAssignments.activeTeacherByClassSubject.has(classSubjectId)) {
          const activePairKey = `${classSubjectId}:${activeTeacherId}`;
          await ensureTeachingAssignment(connection, classSubjectId, activeTeacherId, true);
          existingAssignments.pairSet.add(activePairKey);
          existingAssignments.activeTeacherByClassSubject.set(classSubjectId, activeTeacherId);
          stats.assignmentsCreated += 1;
          stats.activeAssignmentsCreated += 1;
        }

        const currentActiveTeacherId = existingAssignments.activeTeacherByClassSubject.get(classSubjectId) || activeTeacherId;

        for (const teacher of teachers) {
          const pairKey = `${classSubjectId}:${teacher.id}`;

          if (existingAssignments.pairSet.has(pairKey)) {
            stats.assignmentsSkipped += 1;
            continue;
          }

          const isActive = teacher.id === currentActiveTeacherId;
          const result = await ensureTeachingAssignment(connection, classSubjectId, teacher.id, isActive);
          existingAssignments.pairSet.add(pairKey);
          stats.assignmentsCreated += 1;
          if (result.active) {
            existingAssignments.activeTeacherByClassSubject.set(classSubjectId, teacher.id);
            stats.activeAssignmentsCreated += 1;
          }
        }
      }
    }

    await connection.commit();

    console.log('[SEED] Teaching matrix seed completed successfully.');
    console.log(`[SEED] Academic year: ${academicYear.code} (id=${academicYear.id})`);
    console.log(`[SEED] Classes: ${classes.length}, Subjects: ${subjects.length}, Teachers: ${teachers.length}`);
    console.log(`[SEED] Class subjects created: ${stats.classSubjectsCreated}`);
    console.log(`[SEED] Assignments created: ${stats.assignmentsCreated}`);
    console.log(`[SEED] Active assignments created: ${stats.activeAssignmentsCreated}`);
    console.log(`[SEED] Existing assignments skipped: ${stats.assignmentsSkipped}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Teaching matrix seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedTeachingMatrix();
