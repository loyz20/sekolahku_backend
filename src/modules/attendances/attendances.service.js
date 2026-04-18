const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const STATUSES = ['hadir', 'izin', 'sakit', 'alpha'];

const hasDuty = (actor, duty) => Array.isArray(actor?.duties) && actor.duties.includes(duty);
const isSuperadmin = (actor) => hasDuty(actor, 'superadmin');
const isAdmin = (actor) => isSuperadmin(actor) || hasDuty(actor, 'admin');
const isGuruOnly = (actor) => hasDuty(actor, 'guru') && !isAdmin(actor);

const resolveTeacherIdByUserId = async (userId) => {
  const rows = await db.query('SELECT id FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows.length) {
    throw ApiError.forbidden('User is not linked to a teacher profile');
  }
  return rows[0].id;
};

const ensureStudentExists = async (studentId) => {
  const rows = await db.query('SELECT id FROM students WHERE id = ? LIMIT 1', [studentId]);
  if (!rows.length) {
    throw ApiError.badRequest('student_id is invalid');
  }
};

const ensureSubjectExists = async (subjectId) => {
  const rows = await db.query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!rows.length) {
    throw ApiError.badRequest('subject_id is invalid');
  }
};

const ensureGuruCanManageSubject = async (actor, subjectId) => {
  if (!isGuruOnly(actor)) return;

  const teacherId = await resolveTeacherIdByUserId(actor.id);
  const rows = await db.query(
    `SELECT ta.id
     FROM teaching_assignments ta
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     WHERE ta.teacher_id = ?
       AND cs.subject_id = ?
       AND ta.is_active = 1
       AND cs.is_active = 1
     LIMIT 1`,
    [teacherId, subjectId]
  );

  if (!rows.length) {
    throw ApiError.forbidden('You can only manage attendance for subjects assigned to you');
  }
};

const mapAttendance = (row) => ({
  id: row.id,
  student: {
    id: row.student_id,
    nis: row.student_nis,
    name: row.student_name,
  },
  subject: {
    id: row.subject_id,
    code: row.subject_code,
    name: row.subject_name,
  },
  date: row.date,
  status: row.status,
  notes: row.notes,
  recorded_by: row.recorded_by
    ? {
        id: row.recorded_by,
        name: row.recorded_by_name,
      }
    : null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getAttendanceById = async (id, actor) => {
  const rows = await db.query(
    `SELECT
       a.id,
       a.student_id,
       a.subject_id,
       a.date,
       a.status,
       a.notes,
       a.recorded_by,
       a.created_at,
       a.updated_at,
       st.nis AS student_nis,
       st.name AS student_name,
       sb.code AS subject_code,
       sb.name AS subject_name,
       u.name AS recorded_by_name
     FROM attendances a
     INNER JOIN students st ON st.id = a.student_id
     INNER JOIN subjects sb ON sb.id = a.subject_id
     LEFT JOIN users u ON u.id = a.recorded_by
     WHERE a.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Attendance with id ${id} not found`);
  }

  await ensureGuruCanManageSubject(actor, rows[0].subject_id);
  return mapAttendance(rows[0]);
};

const getAttendances = async ({ page = 1, limit = 10, studentId = '', subjectId = '', dateFrom = '', dateTo = '', status = '', actor } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  const countParams = [];

  if (studentId) {
    conditions.push('a.student_id = ?');
    params.push(Number(studentId));
    countParams.push(Number(studentId));
  }

  if (subjectId) {
    conditions.push('a.subject_id = ?');
    params.push(Number(subjectId));
    countParams.push(Number(subjectId));
  }

  if (dateFrom) {
    conditions.push('a.date >= ?');
    params.push(dateFrom);
    countParams.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('a.date <= ?');
    params.push(dateTo);
    countParams.push(dateTo);
  }

  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
    countParams.push(status);
  }

  if (isGuruOnly(actor)) {
    const teacherId = await resolveTeacherIdByUserId(actor.id);
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM teaching_assignments ta
         INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
         WHERE ta.teacher_id = ?
           AND ta.is_active = 1
           AND cs.is_active = 1
           AND cs.subject_id = a.subject_id
       )`
    );
    params.push(teacherId);
    countParams.push(teacherId);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM attendances a
    ${where}
  `;

  const dataSql = `
    SELECT
      a.id,
      a.student_id,
      a.subject_id,
      a.date,
      a.status,
      a.notes,
      a.recorded_by,
      a.created_at,
      a.updated_at,
      st.nis AS student_nis,
      st.name AS student_name,
      sb.code AS subject_code,
      sb.name AS subject_name,
      u.name AS recorded_by_name
    FROM attendances a
    INNER JOIN students st ON st.id = a.student_id
    INNER JOIN subjects sb ON sb.id = a.subject_id
    LEFT JOIN users u ON u.id = a.recorded_by
    ${where}
    ORDER BY a.date DESC, st.name ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    attendances: rows.map(mapAttendance),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const createAttendance = async ({ student_id, subject_id, date, status, notes }, actor) => {
  const normalizedStatus = String(status || '').toLowerCase();
  if (!STATUSES.includes(normalizedStatus)) {
    throw ApiError.badRequest('status is invalid');
  }

  await ensureStudentExists(student_id);
  await ensureSubjectExists(subject_id);
  await ensureGuruCanManageSubject(actor, subject_id);

  const existing = await db.query(
    'SELECT id FROM attendances WHERE student_id = ? AND subject_id = ? AND date = ? LIMIT 1',
    [student_id, subject_id, date]
  );
  if (existing.length) {
    throw ApiError.conflict('Attendance for this student, subject, and date already exists');
  }

  const result = await db.query(
    `INSERT INTO attendances (student_id, subject_id, date, status, notes, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [student_id, subject_id, date, normalizedStatus, notes || null, actor?.id || null]
  );

  return getAttendanceById(result.insertId, actor);
};

const bulkUpsertAttendances = async ({ subject_id, date, entries }, actor) => {
  await ensureSubjectExists(subject_id);
  await ensureGuruCanManageSubject(actor, subject_id);

  const studentIds = Array.from(new Set(entries.map((entry) => Number(entry.student_id))));
  if (!studentIds.length) {
    throw ApiError.badRequest('entries cannot be empty');
  }

  const placeholders = studentIds.map(() => '?').join(', ');
  const existingStudents = await db.query(
    `SELECT id FROM students WHERE id IN (${placeholders})`,
    studentIds
  );

  if (existingStudents.length !== studentIds.length) {
    throw ApiError.badRequest('One or more student_id values are invalid');
  }

  await db.transaction(async (connection) => {
    for (const entry of entries) {
      const normalizedStatus = String(entry.status || '').toLowerCase();
      if (!STATUSES.includes(normalizedStatus)) {
        throw ApiError.badRequest(`Invalid status for student_id ${entry.student_id}`);
      }

      await connection.execute(
        `INSERT INTO attendances (student_id, subject_id, date, status, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           notes = VALUES(notes),
           recorded_by = VALUES(recorded_by),
           updated_at = CURRENT_TIMESTAMP`,
        [
          Number(entry.student_id),
          Number(subject_id),
          date,
          normalizedStatus,
          entry.notes || null,
          actor?.id || null,
        ]
      );
    }
  });

  return {
    upserted: entries.length,
    subject_id: Number(subject_id),
    date,
  };
};

const updateAttendance = async (id, { status, notes }, actor) => {
  const existingRows = await db.query('SELECT id, subject_id FROM attendances WHERE id = ? LIMIT 1', [id]);
  if (!existingRows.length) {
    throw ApiError.notFound(`Attendance with id ${id} not found`);
  }

  await ensureGuruCanManageSubject(actor, existingRows[0].subject_id);

  const updates = [];
  const params = [];

  if (typeof status !== 'undefined') {
    const normalizedStatus = String(status).toLowerCase();
    if (!STATUSES.includes(normalizedStatus)) {
      throw ApiError.badRequest('status is invalid');
    }
    updates.push('status = ?');
    params.push(normalizedStatus);
  }

  if (typeof notes !== 'undefined') {
    updates.push('notes = ?');
    params.push(notes || null);
  }

  updates.push('recorded_by = ?');
  params.push(actor?.id || null);

  if (!updates.length) {
    return getAttendanceById(id, actor);
  }

  params.push(id);

  await db.query(
    `UPDATE attendances
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    params
  );

  return getAttendanceById(id, actor);
};

const deleteAttendance = async (id, actor) => {
  const rows = await db.query('SELECT id, subject_id FROM attendances WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) {
    throw ApiError.notFound(`Attendance with id ${id} not found`);
  }

  await ensureGuruCanManageSubject(actor, rows[0].subject_id);
  await db.query('DELETE FROM attendances WHERE id = ?', [id]);
};

const getAttendanceSummary = async ({ subjectId = '', studentId = '', dateFrom = '', dateTo = '', actor } = {}) => {
  const conditions = [];
  const params = [];

  if (subjectId) {
    conditions.push('a.subject_id = ?');
    params.push(Number(subjectId));
  }

  if (studentId) {
    conditions.push('a.student_id = ?');
    params.push(Number(studentId));
  }

  if (dateFrom) {
    conditions.push('a.date >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('a.date <= ?');
    params.push(dateTo);
  }

  if (isGuruOnly(actor)) {
    const teacherId = await resolveTeacherIdByUserId(actor.id);
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM teaching_assignments ta
         INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
         WHERE ta.teacher_id = ?
           AND ta.is_active = 1
           AND cs.is_active = 1
           AND cs.subject_id = a.subject_id
       )`
    );
    params.push(teacherId);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const rows = await db.query(
    `SELECT a.status, COUNT(*) AS total
     FROM attendances a
     ${where}
     GROUP BY a.status`,
    params
  );

  const base = {
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpha: 0,
  };

  for (const row of rows) {
    base[row.status] = Number(row.total);
  }

  const total = Object.values(base).reduce((sum, value) => sum + value, 0);

  return {
    total,
    by_status: base,
    percentages: {
      hadir: total ? Number(((base.hadir / total) * 100).toFixed(2)) : 0,
      izin: total ? Number(((base.izin / total) * 100).toFixed(2)) : 0,
      sakit: total ? Number(((base.sakit / total) * 100).toFixed(2)) : 0,
      alpha: total ? Number(((base.alpha / total) * 100).toFixed(2)) : 0,
    },
  };
};

module.exports = {
  getAttendances,
  getAttendanceById,
  createAttendance,
  bulkUpsertAttendances,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
};
