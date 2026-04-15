const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getAcademicYears = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    conditions.push('(ay.code LIKE ? OR ay.name LIKE ?)');
    params.push(likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM academic_years ay${where}`;

  const dataSql = `
    SELECT id, code, name, start_date, end_date, semester, is_active, created_at
    FROM academic_years ay
    ${where}
    ORDER BY start_date DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const total = countRow.total;

  const rows = await db.query(dataSql, params);

  return {
    academic_years: rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      semester: r.semester,
      is_active: !!r.is_active,
      created_at: r.created_at,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAcademicYearById = async (id) => {
  const rows = await db.query(
    'SELECT id, code, name, start_date, end_date, semester, is_active, created_at, updated_at FROM academic_years WHERE id = ?',
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Academic year with id ${id} not found`);
  }

  const ay = rows[0];

  return {
    id: ay.id,
    code: ay.code,
    name: ay.name,
    start_date: ay.start_date,
    end_date: ay.end_date,
    semester: ay.semester,
    is_active: !!ay.is_active,
    created_at: ay.created_at,
    updated_at: ay.updated_at,
  };
};

const createAcademicYear = async ({ code, name, start_date, end_date, semester = 1 }) => {
  const existing = await db.query('SELECT id FROM academic_years WHERE code = ?', [code]);

  if (existing.length) {
    throw ApiError.conflict(`Academic year with code "${code}" already exists`);
  }

  if (start_date >= end_date) {
    throw ApiError.badRequest('start_date must be before end_date');
  }

  if (![1, 2].includes(semester)) {
    throw ApiError.badRequest('semester must be 1 or 2');
  }

  const result = await db.query(
    'INSERT INTO academic_years (code, name, start_date, end_date, semester) VALUES (?, ?, ?, ?, ?)',
    [code, name, start_date, end_date, semester]
  );

  return getAcademicYearById(result.insertId);
};

const updateAcademicYear = async (id, { code, name, start_date, end_date, semester }) => {
  const existing = await db.query('SELECT id FROM academic_years WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Academic year with id ${id} not found`);
  }

  if (code !== undefined) {
    const codeConflict = await db.query(
      'SELECT id FROM academic_years WHERE code = ? AND id != ?',
      [code, id]
    );

    if (codeConflict.length) {
      throw ApiError.conflict(`Academic year with code "${code}" already exists`);
    }
  }

  if (start_date !== undefined && end_date !== undefined && start_date >= end_date) {
    throw ApiError.badRequest('start_date must be before end_date');
  }

  if (semester !== undefined && ![1, 2].includes(semester)) {
    throw ApiError.badRequest('semester must be 1 or 2');
  }

  const sets = [];
  const params = [];

  if (code       !== undefined) { sets.push('code = ?');       params.push(code); }
  if (name       !== undefined) { sets.push('name = ?');       params.push(name); }
  if (start_date !== undefined) { sets.push('start_date = ?'); params.push(start_date); }
  if (end_date   !== undefined) { sets.push('end_date = ?');   params.push(end_date); }
  if (semester   !== undefined) { sets.push('semester = ?');   params.push(semester); }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);
  await db.query(`UPDATE academic_years SET ${sets.join(', ')} WHERE id = ?`, params);

  return getAcademicYearById(id);
};

/**
 * Sets the given academic year as active. Deactivates all others atomically.
 */
const activateAcademicYear = async (id) => {
  return db.transaction(async (connection) => {
    const [rows] = await connection.execute(
      'SELECT id FROM academic_years WHERE id = ?',
      [id]
    );

    if (!rows.length) {
      throw ApiError.notFound(`Academic year with id ${id} not found`);
    }

    await connection.execute('UPDATE academic_years SET is_active = 0');
    await connection.execute('UPDATE academic_years SET is_active = 1 WHERE id = ?', [id]);

    const [updated] = await connection.execute(
      'SELECT id, code, name, start_date, end_date, is_active, created_at, updated_at FROM academic_years WHERE id = ?',
      [id]
    );

    const ay = updated[0];

    return {
      id: ay.id,
      code: ay.code,
      name: ay.name,
      start_date: ay.start_date,
      end_date: ay.end_date,
      is_active: !!ay.is_active,
      created_at: ay.created_at,
      updated_at: ay.updated_at,
    };
  });
};

const deleteAcademicYear = async (id) => {
  const existing = await db.query('SELECT id, is_active FROM academic_years WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Academic year with id ${id} not found`);
  }

  if (existing[0].is_active) {
    throw ApiError.conflict('Cannot delete the active academic year. Activate another year first.');
  }

  const anyAssignments = await db.query(
    'SELECT id FROM homeroom_assignments WHERE academic_year_id = ? LIMIT 1',
    [id]
  );

  if (anyAssignments.length) {
    throw ApiError.conflict(
      'Cannot delete academic year that has homeroom assignment records.'
    );
  }

  const anyScores = await db.query(
    'SELECT id FROM scores WHERE academic_year_id = ? LIMIT 1',
    [id]
  );

  if (anyScores.length) {
    throw ApiError.conflict(
      'Cannot delete academic year that has score records.'
    );
  }

  await db.query('DELETE FROM academic_years WHERE id = ?', [id]);
};

module.exports = {
  getAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  deleteAcademicYear,
};
