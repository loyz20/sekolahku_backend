require('dotenv').config();
const mysql = require('mysql2/promise');

const NOTES = process.env.SEED_SCHEDULE_NOTES || 'Seeded schedule slot';
const ASSIGNED_BY = process.env.SEED_SCHEDULE_ASSIGNED_BY
  ? Number(process.env.SEED_SCHEDULE_ASSIGNED_BY)
  : null;

const PERIODS = [
  { start: '07:00:00', end: '07:45:00' },
  { start: '07:45:00', end: '08:30:00' },
  { start: '08:30:00', end: '09:15:00' },
  { start: '09:30:00', end: '10:15:00' },
  { start: '10:15:00', end: '11:00:00' },
  { start: '11:00:00', end: '11:45:00' },
  { start: '13:00:00', end: '13:45:00' },
  { start: '13:45:00', end: '14:30:00' },
];

const DAY_LABELS = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
};

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

async function loadAssignments(connection, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT ta.id AS assignment_id,
            ta.teacher_id,
            ta.class_subject_id,
            c.id AS class_id,
            c.code AS class_code,
            c.name AS class_name,
            s.id AS subject_id,
            s.code AS subject_code,
            s.name AS subject_name,
            t.name AS teacher_name
     FROM teaching_assignments ta
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     WHERE ta.ended_at IS NULL AND cs.academic_year_id = ?
     ORDER BY COALESCE(c.level, ''), c.name ASC, s.name ASC, t.name ASC`,
    [academicYearId]
  );

  if (!rows.length) {
    throw new Error('No active teaching assignments found. Run the teaching assignment seed first.');
  }

  return rows;
}

async function loadExistingSlots(connection, academicYearId) {
  const rows = await fetchRows(
    connection,
    `SELECT ss.id, ss.teaching_assignment_id, ss.day_of_week, ss.start_time, ss.end_time
     FROM schedule_slots ss
     INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     WHERE cs.academic_year_id = ?`,
    [academicYearId]
  );

  const byAssignment = new Set();
  for (const row of rows) {
    byAssignment.add(row.teaching_assignment_id);
  }

  return byAssignment;
}

function generateSlot(index, classCode) {
  const dayOfWeek = (index % 5) + 1;
  const period = PERIODS[Math.floor(index / 5) % PERIODS.length];
  const room = classCode;

  return {
    dayOfWeek,
    startTime: period.start,
    endTime: period.end,
    room,
    notes: `${NOTES} - ${DAY_LABELS[dayOfWeek]} ${period.start.slice(0, 5)}`,
  };
}

async function ensureSlot(connection, assignment, slot) {
  const existingRows = await fetchRows(
    connection,
    `SELECT id FROM schedule_slots
     WHERE teaching_assignment_id = ? AND day_of_week = ? AND start_time = ? AND end_time = ?
     LIMIT 1`,
    [assignment.assignment_id, slot.dayOfWeek, slot.startTime, slot.endTime]
  );

  if (existingRows.length) {
    return { created: false, id: existingRows[0].id };
  }

  const [result] = await connection.execute(
    `INSERT INTO schedule_slots (teaching_assignment_id, day_of_week, start_time, end_time, room, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [assignment.assignment_id, slot.dayOfWeek, slot.startTime, slot.endTime, slot.room, slot.notes]
  );

  return { created: true, id: result.insertId };
}

async function seedSchedule() {
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
    const assignments = await loadAssignments(connection, academicYear.id);
    const existingSlots = await loadExistingSlots(connection, academicYear.id);

    const stats = {
      created: 0,
      skipped: 0,
    };

    for (const [index, assignment] of assignments.entries()) {
      if (existingSlots.has(assignment.assignment_id)) {
        stats.skipped += 1;
        continue;
      }

      const slot = generateSlot(index, assignment.class_code);
      const result = await ensureSlot(connection, assignment, slot);
      if (result.created) {
        stats.created += 1;
      } else {
        stats.skipped += 1;
      }
    }

    await connection.commit();

    console.log('[SEED] Schedule seed completed successfully.');
    console.log(`[SEED] Academic year: ${academicYear.code} (id=${academicYear.id})`);
    console.log(`[SEED] Active assignments processed: ${assignments.length}`);
    console.log(`[SEED] Schedule slots created: ${stats.created}`);
    console.log(`[SEED] Existing schedule slots skipped: ${stats.skipped}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Schedule seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedSchedule();