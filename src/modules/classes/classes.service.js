const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const hasDuty = (actor, duty) => Array.isArray(actor?.duties) && actor.duties.includes(duty);
const isSuperadmin = (actor) => hasDuty(actor, 'superadmin');
const isAdminLike = (actor) => isSuperadmin(actor) || hasDuty(actor, 'admin');

const getClasses = async ({ page = 1, limit = 10, search = '', level = '', assignedOnly = false, actor = null } = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    conditions.push('(c.code LIKE ? OR c.name LIKE ?)');
    params.push(likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch);
  }

  if (level) {
    conditions.push('c.level = ?');
    params.push(level);
    countParams.push(level);
  }

  if (assignedOnly && !isAdminLike(actor)) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM homeroom_assignments ha_filter
      INNER JOIN user_duties ud_filter ON ud_filter.id = ha_filter.user_duty_id
      WHERE ha_filter.class_id = c.id
        AND ha_filter.ended_at IS NULL
        AND ud_filter.user_id = ?
    )`);
    params.push(actor.id);
    countParams.push(actor.id);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM classes c${where}`;

  // Subquery ensures at most one active homeroom per class (from the active academic year).
  const dataSql = `
    SELECT
      c.id,
      c.code,
      c.name,
      c.level,
      c.created_at,
      u.id   AS homeroom_user_id,
      u.name AS homeroom_user_name,
      u.nip  AS homeroom_user_nip,
      ha.ay_id, ha.ay_code, ha.ay_name
    FROM classes c
    LEFT JOIN (
      SELECT h.class_id, h.user_duty_id,
             ay.id AS ay_id, ay.code AS ay_code, ay.name AS ay_name
      FROM homeroom_assignments h
      INNER JOIN academic_years ay ON ay.id = h.academic_year_id
      WHERE h.ended_at IS NULL
    ) ha ON ha.class_id = c.id
    LEFT JOIN user_duties ud ON ud.id = ha.user_duty_id
    LEFT JOIN users u ON u.id = ud.user_id
    ${where}
    ORDER BY c.level ASC, c.name ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const total = countRow.total;

  const rows = await db.query(dataSql, params);

  const classes = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    level: r.level || null,
    created_at: r.created_at,
    homeroom_teacher: r.homeroom_user_id
      ? {
          id: r.homeroom_user_id,
          name: r.homeroom_user_name,
          nip: r.homeroom_user_nip || null,
          academic_year: { id: r.ay_id, code: r.ay_code, name: r.ay_name },
        }
      : null,
  }));

  return {
    classes,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getClassById = async (id) => {
  const rows = await db.query(
    'SELECT id, code, name, level, created_at, updated_at FROM classes WHERE id = ?',
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Class with id ${id} not found`);
  }

  const cls = rows[0];

  const assignments = await db.query(
    `SELECT
      ha.id,
      ha.assigned_at,
      ha.ended_at,
      ha.notes,
      u.id   AS user_id,
      u.name AS user_name,
      u.nip  AS user_nip,
      ay.id   AS ay_id,
      ay.code AS ay_code,
      ay.name AS ay_name
    FROM homeroom_assignments ha
    INNER JOIN user_duties ud ON ud.id = ha.user_duty_id
    INNER JOIN users u ON u.id = ud.user_id
    INNER JOIN academic_years ay ON ay.id = ha.academic_year_id
    WHERE ha.class_id = ?
    ORDER BY ha.assigned_at DESC`,
    [id]
  );

  const students = await db.query(
    `SELECT
      s.id,
      s.nis,
      s.name,
      s.gender,
      s.email,
      s.is_active,
      se.id AS enrollment_id,
      se.enrollment_date,
      se.ended_date,
      ay.id AS ay_id,
      ay.code AS ay_code,
      ay.name AS ay_name
    FROM student_enrollments se
    INNER JOIN students s ON s.id = se.student_id
    INNER JOIN academic_years ay ON ay.id = se.academic_year_id
    WHERE se.class_id = ?
    ORDER BY se.enrollment_date DESC, s.name ASC`,
    [id]
  );

  return {
    id: cls.id,
    code: cls.code,
    name: cls.name,
    level: cls.level || null,
    created_at: cls.created_at,
    updated_at: cls.updated_at,
    homeroom_assignments: assignments.map((a) => ({
      id: a.id,
      teacher: { id: a.user_id, name: a.user_name, nip: a.user_nip || null },
      academic_year: { id: a.ay_id, code: a.ay_code, name: a.ay_name },
      assigned_at: a.assigned_at,
      ended_at: a.ended_at || null,
      is_active: a.ended_at === null,
      notes: a.notes || null,
    })),
    students: students.map((s) => ({
      id: s.id,
      nis: s.nis,
      name: s.name,
      gender: s.gender || null,
      email: s.email || null,
      is_active: !!s.is_active,
      enrollment: {
        id: s.enrollment_id,
        enrollment_date: s.enrollment_date,
        ended_date: s.ended_date || null,
        is_active: s.ended_date === null,
        academic_year: {
          id: s.ay_id,
          code: s.ay_code,
          name: s.ay_name,
        },
      },
    })),
  };
};

const createClass = async ({ code, name, level = null }) => {
  const existing = await db.query('SELECT id FROM classes WHERE code = ?', [code]);

  if (existing.length) {
    throw ApiError.conflict(`Class with code "${code}" already exists`);
  }

  const result = await db.query(
    'INSERT INTO classes (code, name, level) VALUES (?, ?, ?)',
    [code, name, level || null]
  );

  return getClassById(result.insertId);
};

const updateClass = async (id, { code, name, level }) => {
  const existing = await db.query('SELECT id FROM classes WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Class with id ${id} not found`);
  }

  if (code !== undefined) {
    const codeConflict = await db.query(
      'SELECT id FROM classes WHERE code = ? AND id != ?',
      [code, id]
    );

    if (codeConflict.length) {
      throw ApiError.conflict(`Class with code "${code}" already exists`);
    }
  }

  const sets = [];
  const params = [];

  if (code !== undefined) { sets.push('code = ?'); params.push(code); }
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (level !== undefined) { sets.push('level = ?'); params.push(level || null); }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);
  await db.query(`UPDATE classes SET ${sets.join(', ')} WHERE id = ?`, params);

  return getClassById(id);
};

const deleteClass = async (id) => {
  const existing = await db.query('SELECT id FROM classes WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Class with id ${id} not found`);
  }

  const anyAssignments = await db.query(
    'SELECT id FROM homeroom_assignments WHERE class_id = ? LIMIT 1',
    [id]
  );

  if (anyAssignments.length) {
    throw ApiError.conflict(
      'Cannot delete class that has homeroom assignment records. Revoke all assignments first.'
    );
  }

  await db.query('DELETE FROM classes WHERE id = ?', [id]);
};

module.exports = { getClasses, getClassById, createClass, updateClass, deleteClass };
