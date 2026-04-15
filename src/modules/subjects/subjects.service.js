const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getSubjects = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    conditions.push('(s.code LIKE ? OR s.name LIKE ?)');
    params.push(likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM subjects s${where}`;
  const dataSql = `
    SELECT s.id, s.code, s.name, s.description, s.is_active, s.created_at
    FROM subjects s
    ${where}
    ORDER BY s.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const total = countRow.total;
  const rows = await db.query(dataSql, params);

  return {
    subjects: rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || null,
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

const getSubjectById = async (id) => {
  const rows = await db.query(
    `SELECT id, code, name, description, is_active, created_at, updated_at
     FROM subjects
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Subject with id ${id} not found`);
  }

  const subject = rows[0];

  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description || null,
    is_active: !!subject.is_active,
    created_at: subject.created_at,
    updated_at: subject.updated_at,
  };
};

const createSubject = async ({ code, name, description = null }) => {
  const existing = await db.query('SELECT id FROM subjects WHERE code = ?', [code]);
  if (existing.length) {
    throw ApiError.conflict(`Subject with code "${code}" already exists`);
  }

  const result = await db.query(
    'INSERT INTO subjects (code, name, description) VALUES (?, ?, ?)',
    [code, name, description || null]
  );

  return getSubjectById(result.insertId);
};

const updateSubject = async (id, { code, name, description }) => {
  const existing = await db.query('SELECT id FROM subjects WHERE id = ?', [id]);
  if (!existing.length) {
    throw ApiError.notFound(`Subject with id ${id} not found`);
  }

  if (code !== undefined) {
    const codeConflict = await db.query('SELECT id FROM subjects WHERE code = ? AND id != ?', [code, id]);
    if (codeConflict.length) {
      throw ApiError.conflict(`Subject with code "${code}" already exists`);
    }
  }

  const sets = [];
  const params = [];

  if (code !== undefined) { sets.push('code = ?'); params.push(code); }
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description || null); }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);
  await db.query(`UPDATE subjects SET ${sets.join(', ')} WHERE id = ?`, params);

  return getSubjectById(id);
};

const toggleSubjectStatus = async (id) => {
  const rows = await db.query('SELECT is_active FROM subjects WHERE id = ?', [id]);
  if (!rows.length) {
    throw ApiError.notFound(`Subject with id ${id} not found`);
  }

  const newStatus = rows[0].is_active ? 0 : 1;
  await db.query('UPDATE subjects SET is_active = ? WHERE id = ?', [newStatus, id]);

  const updatedRows = await db.query('SELECT id, is_active, updated_at FROM subjects WHERE id = ?', [id]);
  const updated = updatedRows[0];

  return {
    id: updated.id,
    is_active: !!updated.is_active,
    updated_at: updated.updated_at,
  };
};

const deleteSubject = async (id) => {
  const existing = await db.query('SELECT id FROM subjects WHERE id = ?', [id]);
  if (!existing.length) {
    throw ApiError.notFound(`Subject with id ${id} not found`);
  }

  await db.query('DELETE FROM subjects WHERE id = ?', [id]);
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
  deleteSubject,
};
