const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const mapViolationType = (row) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  severity: row.severity,
  default_points: Number(row.default_points),
  description: row.description,
  is_active: !!row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapViolation = (row) => ({
  id: row.id,
  student: {
    id: row.student_id,
    nis: row.student_nis,
    name: row.student_name,
  },
  class: {
    id: row.class_id,
    code: row.class_code,
    name: row.class_name,
  },
  academic_year: {
    id: row.academic_year_id,
    code: row.academic_year_code,
    name: row.academic_year_name,
  },
  violation_type: {
    id: row.violation_type_id,
    code: row.type_code,
    name: row.type_name,
    severity: row.type_severity,
  },
  points: Number(row.points),
  violation_date: row.violation_date,
  description: row.description,
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

const mapViolationStudent = (row) => ({
  student: {
    id: row.student_id,
    nis: row.student_nis,
    name: row.student_name,
  },
  class: {
    id: row.class_id,
    code: row.class_code,
    name: row.class_name,
  },
  academic_year: {
    id: row.academic_year_id,
    code: row.academic_year_code,
    name: row.academic_year_name,
  },
  total_violations: Number(row.total_violations),
  total_points: Number(row.total_points),
  last_violation_date: row.last_violation_date,
  first_violation_date: row.first_violation_date,
  latest_violation_type: row.latest_violation_type
    ? {
        id: row.latest_violation_type_id,
        code: row.latest_violation_type_code,
        name: row.latest_violation_type,
        severity: row.latest_violation_severity,
      }
    : null,
});

const ensureStudentExists = async (studentId) => {
  const rows = await db.query('SELECT id FROM students WHERE id = ? LIMIT 1', [studentId]);
  if (!rows.length) {
    throw ApiError.badRequest('student_id is invalid');
  }
};

const ensureClassExists = async (classId) => {
  const rows = await db.query('SELECT id FROM classes WHERE id = ? LIMIT 1', [classId]);
  if (!rows.length) {
    throw ApiError.badRequest('class_id is invalid');
  }
};

const ensureAcademicYearExists = async (academicYearId) => {
  const rows = await db.query('SELECT id FROM academic_years WHERE id = ? LIMIT 1', [academicYearId]);
  if (!rows.length) {
    throw ApiError.badRequest('academic_year_id is invalid');
  }
};

const ensureViolationTypeExists = async (violationTypeId) => {
  const rows = await db.query('SELECT id FROM violation_types WHERE id = ? LIMIT 1', [violationTypeId]);
  if (!rows.length) {
    throw ApiError.badRequest('violation_type_id is invalid');
  }
};

const createViolationRecord = async (connection, payload, actor) => {
  const {
    student_id,
    class_id,
    academic_year_id,
    violation_type_id,
    violation_date,
    points,
    description,
    notes,
  } = payload;

  let resolvedPoints = points;
  if (typeof resolvedPoints === 'undefined' || resolvedPoints === null || resolvedPoints === '') {
    const [typeRow] = await connection.execute(
      'SELECT default_points FROM violation_types WHERE id = ? LIMIT 1',
      [violation_type_id]
    );
    resolvedPoints = typeRow.length ? Number(typeRow[0].default_points) : 0;
  }

  const [result] = await connection.execute(
    `INSERT INTO student_violations (
      student_id, class_id, academic_year_id, violation_type_id,
      violation_date, points, description, notes, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(student_id),
      Number(class_id),
      Number(academic_year_id),
      Number(violation_type_id),
      violation_date,
      Number(resolvedPoints) || 0,
      String(description).trim(),
      notes || null,
      actor?.id || null,
    ]
  );

  return result.insertId;
};

const generateViolationTypeCode = async () => {
  const rows = await db.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED)), 0) AS last_number
     FROM violation_types
     WHERE code LIKE 'VT-%'`
  );

  const nextNumber = Number(rows[0]?.last_number || 0) + 1;
  return `VT-${String(nextNumber).padStart(3, '0')}`;
};

const getViolationTypeById = async (id) => {
  const rows = await db.query(
    `SELECT id, code, name, severity, default_points, description, is_active, created_at, updated_at
     FROM violation_types
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Violation type with id ${id} not found`);
  }

  return mapViolationType(rows[0]);
};

const getViolationById = async (id) => {
  const rows = await db.query(
    `SELECT
       v.id,
       v.student_id,
       v.class_id,
       v.academic_year_id,
       v.violation_type_id,
       v.points,
       v.violation_date,
       v.description,
       v.notes,
       v.recorded_by,
       v.created_at,
       v.updated_at,
       st.nis AS student_nis,
       st.name AS student_name,
       c.code AS class_code,
       c.name AS class_name,
       ay.code AS academic_year_code,
       ay.name AS academic_year_name,
       vt.code AS type_code,
       vt.name AS type_name,
       vt.severity AS type_severity,
       u.name AS recorded_by_name
     FROM student_violations v
     INNER JOIN students st ON st.id = v.student_id
     INNER JOIN classes c ON c.id = v.class_id
     INNER JOIN academic_years ay ON ay.id = v.academic_year_id
     INNER JOIN violation_types vt ON vt.id = v.violation_type_id
     LEFT JOIN users u ON u.id = v.recorded_by
     WHERE v.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Violation with id ${id} not found`);
  }

  return mapViolation(rows[0]);
};

const getViolationByIdFromConnection = async (connection, id) => {
  const [rows] = await connection.execute(
    `SELECT
       v.id,
       v.student_id,
       v.class_id,
       v.academic_year_id,
       v.violation_type_id,
       v.points,
       v.violation_date,
       v.description,
       v.notes,
       v.recorded_by,
       v.created_at,
       v.updated_at,
       st.nis AS student_nis,
       st.name AS student_name,
       c.code AS class_code,
       c.name AS class_name,
       ay.code AS academic_year_code,
       ay.name AS academic_year_name,
       vt.code AS type_code,
       vt.name AS type_name,
       vt.severity AS type_severity,
       u.name AS recorded_by_name
     FROM student_violations v
     INNER JOIN students st ON st.id = v.student_id
     INNER JOIN classes c ON c.id = v.class_id
     INNER JOIN academic_years ay ON ay.id = v.academic_year_id
     INNER JOIN violation_types vt ON vt.id = v.violation_type_id
     LEFT JOIN users u ON u.id = v.recorded_by
     WHERE v.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Violation with id ${id} not found`);
  }

  return mapViolation(rows[0]);
};

const getViolationTypes = async ({ page = 1, limit = 10, search = '', isActive, severity = '' } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    const likeSearch = `%${search}%`;
    conditions.push('(code LIKE ? OR name LIKE ?)');
    params.push(likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch);
  }

  if (typeof isActive === 'boolean') {
    conditions.push('is_active = ?');
    params.push(isActive ? 1 : 0);
    countParams.push(isActive ? 1 : 0);
  }

  if (severity) {
    conditions.push('severity = ?');
    params.push(severity);
    countParams.push(severity);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const [countRow] = await db.query(`SELECT COUNT(*) AS total FROM violation_types${where}`, countParams);
  const rows = await db.query(
    `SELECT id, code, name, severity, default_points, description, is_active, created_at, updated_at
     FROM violation_types
     ${where}
     ORDER BY name ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    types: rows.map(mapViolationType),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const createViolationType = async ({ code, name, severity, default_points = 0, description = null, is_active = true }) => {
  const normalizedCode = code ? String(code).trim().toUpperCase() : await generateViolationTypeCode();
  const normalizedName = String(name).trim();

  const exists = await db.query('SELECT id FROM violation_types WHERE code = ? LIMIT 1', [normalizedCode]);
  if (exists.length) {
    throw ApiError.conflict(`Violation type with code "${normalizedCode}" already exists`);
  }

  const result = await db.query(
    `INSERT INTO violation_types (code, name, severity, default_points, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [normalizedCode, normalizedName, severity, Number(default_points) || 0, description || null, is_active ? 1 : 0]
  );

  return getViolationTypeById(result.insertId);
};

const createViolations = async (payload, actor) => {
  const {
    student_ids,
    class_id,
    academic_year_id,
    violation_type_id,
    violation_date,
    points,
    description,
    notes,
  } = payload;

  const uniqueStudentIds = Array.from(new Set((student_ids || []).map((id) => Number(id))));

  if (!uniqueStudentIds.length) {
    throw ApiError.badRequest('student_ids must contain at least one student');
  }

  await ensureClassExists(class_id);
  await ensureAcademicYearExists(academic_year_id);
  await ensureViolationTypeExists(violation_type_id);

  for (const studentId of uniqueStudentIds) {
    await ensureStudentExists(studentId);
  }

  return db.transaction(async (connection) => {
    const insertedIds = [];

    for (const studentId of uniqueStudentIds) {
      const insertId = await createViolationRecord(
        connection,
        {
          student_id: studentId,
          class_id,
          academic_year_id,
          violation_type_id,
          violation_date,
          points,
          description,
          notes,
        },
        actor
      );

      insertedIds.push(insertId);
    }

    const rows = [];
    for (const insertId of insertedIds) {
      const item = await getViolationByIdFromConnection(connection, insertId);
      rows.push(item);
    }

    return rows;
  });
};

const updateViolationType = async (id, payload) => {
  await getViolationTypeById(id);

  const sets = [];
  const params = [];

  if (typeof payload.code !== 'undefined') {
    const normalizedCode = String(payload.code).trim().toLowerCase();
    const conflict = await db.query('SELECT id FROM violation_types WHERE code = ? AND id != ? LIMIT 1', [normalizedCode, id]);
    if (conflict.length) {
      throw ApiError.conflict(`Violation type with code "${normalizedCode}" already exists`);
    }
    sets.push('code = ?');
    params.push(normalizedCode);
  }

  if (typeof payload.name !== 'undefined') {
    sets.push('name = ?');
    params.push(String(payload.name).trim());
  }

  if (typeof payload.severity !== 'undefined') {
    sets.push('severity = ?');
    params.push(payload.severity);
  }

  if (typeof payload.default_points !== 'undefined') {
    sets.push('default_points = ?');
    params.push(Number(payload.default_points) || 0);
  }

  if (typeof payload.description !== 'undefined') {
    sets.push('description = ?');
    params.push(payload.description || null);
  }

  if (typeof payload.is_active !== 'undefined') {
    sets.push('is_active = ?');
    params.push(payload.is_active ? 1 : 0);
  }

  if (!sets.length) {
    return getViolationTypeById(id);
  }

  params.push(id);
  await db.query(`UPDATE violation_types SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

  return getViolationTypeById(id);
};

const deleteViolationType = async (id) => {
  await getViolationTypeById(id);

  const used = await db.query('SELECT id FROM student_violations WHERE violation_type_id = ? LIMIT 1', [id]);
  if (used.length) {
    throw ApiError.conflict('Cannot delete violation type that is already used by violation records');
  }

  await db.query('DELETE FROM violation_types WHERE id = ?', [id]);
};

const getViolations = async ({
  page = 1,
  limit = 10,
  search = '',
  studentId = '',
  classId = '',
  academicYearId = '',
  violationTypeId = '',
  severity = '',
  dateFrom = '',
  dateTo = '',
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    const likeSearch = `%${search}%`;
    conditions.push('(st.name LIKE ? OR st.nis LIKE ? OR v.description LIKE ?)');
    params.push(likeSearch, likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch, likeSearch);
  }

  if (studentId) {
    conditions.push('v.student_id = ?');
    params.push(Number(studentId));
    countParams.push(Number(studentId));
  }

  if (classId) {
    conditions.push('v.class_id = ?');
    params.push(Number(classId));
    countParams.push(Number(classId));
  }

  if (academicYearId) {
    conditions.push('v.academic_year_id = ?');
    params.push(Number(academicYearId));
    countParams.push(Number(academicYearId));
  }

  if (violationTypeId) {
    conditions.push('v.violation_type_id = ?');
    params.push(Number(violationTypeId));
    countParams.push(Number(violationTypeId));
  }

  if (severity) {
    conditions.push('vt.severity = ?');
    params.push(severity);
    countParams.push(severity);
  }

  if (dateFrom) {
    conditions.push('v.violation_date >= ?');
    params.push(dateFrom);
    countParams.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('v.violation_date <= ?');
    params.push(dateTo);
    countParams.push(dateTo);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM student_violations v
    INNER JOIN students st ON st.id = v.student_id
    INNER JOIN violation_types vt ON vt.id = v.violation_type_id
    ${where}
  `;

  const dataSql = `
    SELECT
      v.id,
      v.student_id,
      v.class_id,
      v.academic_year_id,
      v.violation_type_id,
      v.points,
      v.violation_date,
      v.description,
      v.notes,
      v.recorded_by,
      v.created_at,
      v.updated_at,
      st.nis AS student_nis,
      st.name AS student_name,
      c.code AS class_code,
      c.name AS class_name,
      ay.code AS academic_year_code,
      ay.name AS academic_year_name,
      vt.code AS type_code,
      vt.name AS type_name,
      vt.severity AS type_severity,
      u.name AS recorded_by_name
    FROM student_violations v
    INNER JOIN students st ON st.id = v.student_id
    INNER JOIN classes c ON c.id = v.class_id
    INNER JOIN academic_years ay ON ay.id = v.academic_year_id
    INNER JOIN violation_types vt ON vt.id = v.violation_type_id
    LEFT JOIN users u ON u.id = v.recorded_by
    ${where}
    ORDER BY v.violation_date DESC, v.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    violations: rows.map(mapViolation),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const getViolationStudents = async ({
  page = 1,
  limit = 10,
  search = '',
  classId = '',
  academicYearId = '',
  violationTypeId = '',
  severity = '',
  dateFrom = '',
  dateTo = '',
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    const likeSearch = `%${search}%`;
    conditions.push('(st.name LIKE ? OR st.nis LIKE ? OR v.description LIKE ?)');
    params.push(likeSearch, likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch, likeSearch);
  }

  if (classId) {
    conditions.push('v.class_id = ?');
    params.push(Number(classId));
    countParams.push(Number(classId));
  }

  if (academicYearId) {
    conditions.push('v.academic_year_id = ?');
    params.push(Number(academicYearId));
    countParams.push(Number(academicYearId));
  }

  if (violationTypeId) {
    conditions.push('v.violation_type_id = ?');
    params.push(Number(violationTypeId));
    countParams.push(Number(violationTypeId));
  }

  if (severity) {
    conditions.push('vt.severity = ?');
    params.push(severity);
    countParams.push(severity);
  }

  if (dateFrom) {
    conditions.push('v.violation_date >= ?');
    params.push(dateFrom);
    countParams.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('v.violation_date <= ?');
    params.push(dateTo);
    countParams.push(dateTo);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT v.student_id, v.class_id
      FROM student_violations v
      INNER JOIN students st ON st.id = v.student_id
      INNER JOIN violation_types vt ON vt.id = v.violation_type_id
      ${where}
      GROUP BY v.student_id, v.class_id
    ) grouped_rows
  `;

  const dataSql = `
    SELECT
      v.student_id,
      st.nis AS student_nis,
      st.name AS student_name,
      v.class_id,
      c.code AS class_code,
      c.name AS class_name,
      v.academic_year_id,
      ay.code AS academic_year_code,
      ay.name AS academic_year_name,
      COUNT(*) AS total_violations,
      COALESCE(SUM(v.points), 0) AS total_points,
      MAX(v.violation_date) AS last_violation_date,
      MIN(v.violation_date) AS first_violation_date,
      SUBSTRING_INDEX(GROUP_CONCAT(vt.id ORDER BY v.violation_date DESC, v.created_at DESC), ',', 1) AS latest_violation_type_id,
      SUBSTRING_INDEX(GROUP_CONCAT(vt.code ORDER BY v.violation_date DESC, v.created_at DESC), ',', 1) AS latest_violation_type_code,
      SUBSTRING_INDEX(GROUP_CONCAT(vt.name ORDER BY v.violation_date DESC, v.created_at DESC), ',', 1) AS latest_violation_type,
      SUBSTRING_INDEX(GROUP_CONCAT(vt.severity ORDER BY v.violation_date DESC, v.created_at DESC), ',', 1) AS latest_violation_severity
    FROM student_violations v
    INNER JOIN students st ON st.id = v.student_id
    INNER JOIN classes c ON c.id = v.class_id
    INNER JOIN academic_years ay ON ay.id = v.academic_year_id
    INNER JOIN violation_types vt ON vt.id = v.violation_type_id
    ${where}
    GROUP BY v.student_id, st.nis, st.name, v.class_id, c.code, c.name, v.academic_year_id, ay.code, ay.name
    ORDER BY total_violations DESC, total_points DESC, st.name ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    students: rows.map(mapViolationStudent),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const createViolation = async (payload, actor) => {
  const {
    student_id,
    class_id,
    academic_year_id,
    violation_type_id,
    violation_date,
    points,
    description,
    notes,
  } = payload;

  await ensureStudentExists(student_id);
  await ensureClassExists(class_id);
  await ensureAcademicYearExists(academic_year_id);
  await ensureViolationTypeExists(violation_type_id);

  return db.transaction(async (connection) => {
    const insertId = await createViolationRecord(
      connection,
      {
        student_id,
        class_id,
        academic_year_id,
        violation_type_id,
        violation_date,
        points,
        description,
        notes,
      },
      actor
    );

    return getViolationByIdFromConnection(connection, insertId);
  });
};

const updateViolation = async (id, payload, actor) => {
  const existing = await getViolationById(id);

  const nextStudentId = typeof payload.student_id === 'undefined' ? existing.student.id : payload.student_id;
  const nextClassId = typeof payload.class_id === 'undefined' ? existing.class.id : payload.class_id;
  const nextAcademicYearId = typeof payload.academic_year_id === 'undefined' ? existing.academic_year.id : payload.academic_year_id;
  const nextTypeId = typeof payload.violation_type_id === 'undefined' ? existing.violation_type.id : payload.violation_type_id;

  await ensureStudentExists(nextStudentId);
  await ensureClassExists(nextClassId);
  await ensureAcademicYearExists(nextAcademicYearId);
  await ensureViolationTypeExists(nextTypeId);

  const sets = [];
  const params = [];

  if (typeof payload.student_id !== 'undefined') {
    sets.push('student_id = ?');
    params.push(Number(payload.student_id));
  }

  if (typeof payload.class_id !== 'undefined') {
    sets.push('class_id = ?');
    params.push(Number(payload.class_id));
  }

  if (typeof payload.academic_year_id !== 'undefined') {
    sets.push('academic_year_id = ?');
    params.push(Number(payload.academic_year_id));
  }

  if (typeof payload.violation_type_id !== 'undefined') {
    sets.push('violation_type_id = ?');
    params.push(Number(payload.violation_type_id));
  }

  if (typeof payload.violation_date !== 'undefined') {
    sets.push('violation_date = ?');
    params.push(payload.violation_date);
  }

  if (typeof payload.points !== 'undefined') {
    sets.push('points = ?');
    params.push(Number(payload.points) || 0);
  }

  if (typeof payload.description !== 'undefined') {
    sets.push('description = ?');
    params.push(String(payload.description).trim());
  }

  if (typeof payload.notes !== 'undefined') {
    sets.push('notes = ?');
    params.push(payload.notes || null);
  }

  sets.push('recorded_by = ?');
  params.push(actor?.id || null);

  if (!sets.length) {
    return getViolationById(id);
  }

  params.push(id);
  await db.query(
    `UPDATE student_violations SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );

  return getViolationById(id);
};

const deleteViolation = async (id) => {
  await getViolationById(id);
  await db.query('DELETE FROM student_violations WHERE id = ?', [id]);
};

const getViolationSummary = async ({
  classId = '',
  academicYearId = '',
  violationTypeId = '',
  severity = '',
  dateFrom = '',
  dateTo = '',
} = {}) => {
  const conditions = [];
  const params = [];

  if (classId) {
    conditions.push('v.class_id = ?');
    params.push(Number(classId));
  }

  if (academicYearId) {
    conditions.push('v.academic_year_id = ?');
    params.push(Number(academicYearId));
  }

  if (violationTypeId) {
    conditions.push('v.violation_type_id = ?');
    params.push(Number(violationTypeId));
  }

  if (severity) {
    conditions.push('vt.severity = ?');
    params.push(severity);
  }

  if (dateFrom) {
    conditions.push('v.violation_date >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('v.violation_date <= ?');
    params.push(dateTo);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const [totalRow] = await db.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(v.points), 0) AS total_points
     FROM student_violations v
     INNER JOIN violation_types vt ON vt.id = v.violation_type_id
     ${where}`,
    params
  );

  const severityRows = await db.query(
    `SELECT vt.severity, COUNT(*) AS total
     FROM student_violations v
     INNER JOIN violation_types vt ON vt.id = v.violation_type_id
     ${where}
     GROUP BY vt.severity`,
    params
  );

  const typeRows = await db.query(
    `SELECT vt.id, vt.code, vt.name, COUNT(*) AS total, COALESCE(SUM(v.points), 0) AS points
     FROM student_violations v
     INNER JOIN violation_types vt ON vt.id = v.violation_type_id
     ${where}
     GROUP BY vt.id, vt.code, vt.name
     ORDER BY total DESC, vt.name ASC`,
    params
  );

  const bySeverity = {
    minor: 0,
    moderate: 0,
    severe: 0,
  };

  for (const row of severityRows) {
    bySeverity[row.severity] = Number(row.total);
  }

  return {
    total: Number(totalRow.total || 0),
    total_points: Number(totalRow.total_points || 0),
    by_severity: bySeverity,
    by_type: typeRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      total: Number(row.total),
      points: Number(row.points),
    })),
  };
};

module.exports = {
  getViolationTypes,
  getViolationTypeById,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  getViolations,
  getViolationStudents,
  getViolationById,
  createViolation,
  createViolations,
  updateViolation,
  deleteViolation,
  getViolationSummary,
};
