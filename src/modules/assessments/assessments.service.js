const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const hasDuty = (actor, duty) => Array.isArray(actor?.duties) && actor.duties.includes(duty);
const isSuperadmin = (actor) => hasDuty(actor, 'superadmin');
const isAdmin = (actor) => isSuperadmin(actor) || hasDuty(actor, 'admin');
const isGuruOnly = (actor) => hasDuty(actor, 'guru') && !isAdmin(actor);

const resolveTeacherIdByUserId = async (userId) => {
  const [teacher] = await db.query('SELECT id FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
  if (!teacher) {
    throw ApiError.forbidden('User is not linked to a teacher profile');
  }
  return teacher.id;
};

const ensureAcademicYearExists = async (academicYearId) => {
  const [year] = await db.query('SELECT id, code, name FROM academic_years WHERE id = ? LIMIT 1', [academicYearId]);
  if (!year) {
    throw ApiError.badRequest('academic_year_id is invalid');
  }
  return year;
};

const getAssessments = async ({
  page = 1,
  limit = 10,
  search = '',
  namaPenilaian = '',
  isActive,
  teacherId = '',
  academicYearId = '',
  actor,
} = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    conditions.push('(a.nama_penilaian LIKE ? OR a.description LIKE ?)');
    params.push(likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch);
  }

  if (namaPenilaian) {
    conditions.push('a.nama_penilaian = ?');
    params.push(namaPenilaian);
    countParams.push(namaPenilaian);
  }

  let effectiveTeacherId = teacherId;
  if (isGuruOnly(actor)) {
    effectiveTeacherId = await resolveTeacherIdByUserId(actor.id);
  }

  if (effectiveTeacherId) {
    conditions.push('a.teacher_id = ?');
    params.push(Number(effectiveTeacherId));
    countParams.push(Number(effectiveTeacherId));
  }

  if (academicYearId) {
    await ensureAcademicYearExists(Number(academicYearId));
    conditions.push('a.academic_year_id = ?');
    params.push(Number(academicYearId));
    countParams.push(Number(academicYearId));
  }

  if (typeof isActive === 'boolean') {
    conditions.push('a.is_active = ?');
    params.push(isActive ? 1 : 0);
    countParams.push(isActive ? 1 : 0);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM assessments a${where}`;
  const dataSql = `
        SELECT a.id, a.nama_penilaian, a.bobot, a.description, a.is_active, a.created_at,
          ay.id AS academic_year_id, ay.code AS academic_year_code, ay.name AS academic_year_name,
           t.id AS teacher_id, t.name AS teacher_name, t.nip AS teacher_nip
    FROM assessments a
        INNER JOIN academic_years ay ON ay.id = a.academic_year_id
    LEFT JOIN teachers t ON t.id = a.teacher_id
    ${where}
    ORDER BY a.id ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    assessments: rows.map((r) => ({
      id: r.id,
      nama_penilaian: r.nama_penilaian,
      bobot: Number(r.bobot),
      description: r.description || null,
      is_active: !!r.is_active,
      created_at: r.created_at,
      academic_year: {
        id: r.academic_year_id,
        code: r.academic_year_code,
        name: r.academic_year_name,
      },
      teacher: r.teacher_id
        ? { id: r.teacher_id, name: r.teacher_name, nip: r.teacher_nip || null }
        : null,
    })),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const getAssessmentById = async (id, actor, academicYearId = null) => {
  const rows = await db.query(
    `SELECT a.id, a.nama_penilaian, a.bobot, a.description, a.is_active, a.created_at, a.updated_at,
            ay.id AS academic_year_id, ay.code AS academic_year_code, ay.name AS academic_year_name,
            t.id AS teacher_id, t.name AS teacher_name, t.nip AS teacher_nip
     FROM assessments a
     INNER JOIN academic_years ay ON ay.id = a.academic_year_id
     LEFT JOIN teachers t ON t.id = a.teacher_id
     WHERE a.id = ?`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  const a = rows[0];

  if (academicYearId && Number(a.academic_year_id) !== Number(academicYearId)) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (a.teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only access your own assessments');
    }
  }

  return {
    id: a.id,
    nama_penilaian: a.nama_penilaian,
    bobot: Number(a.bobot),
    description: a.description || null,
    is_active: !!a.is_active,
    created_at: a.created_at,
    updated_at: a.updated_at,
    academic_year: {
      id: a.academic_year_id,
      code: a.academic_year_code,
      name: a.academic_year_name,
    },
    teacher: a.teacher_id
      ? { id: a.teacher_id, name: a.teacher_name, nip: a.teacher_nip || null }
      : null,
  };
};

const createAssessment = async ({ nama_penilaian, bobot, description = null, teacher_id, academic_year_id }, actor) => {
  let teacherId = teacher_id;
  if (isGuruOnly(actor)) {
    teacherId = await resolveTeacherIdByUserId(actor.id);
  }

  if (!teacherId) {
    throw ApiError.badRequest('teacher_id is required');
  }

  if (!academic_year_id) {
    throw ApiError.badRequest('academic_year_id is required');
  }

  await ensureAcademicYearExists(Number(academic_year_id));

  const existing = await db.query(
    'SELECT id FROM assessments WHERE nama_penilaian = ? AND teacher_id = ? AND academic_year_id = ?',
    [nama_penilaian, teacherId, Number(academic_year_id)]
  );
  if (existing.length) {
    throw ApiError.conflict(`Assessment "${nama_penilaian}" already exists for this teacher in selected academic year`);
  }

  const result = await db.query(
    'INSERT INTO assessments (teacher_id, academic_year_id, nama_penilaian, bobot, description) VALUES (?, ?, ?, ?, ?)',
    [teacherId, Number(academic_year_id), nama_penilaian, bobot, description || null]
  );

  return getAssessmentById(result.insertId, actor, Number(academic_year_id));
};

const updateAssessment = async (id, { nama_penilaian, bobot, description, is_active }, actor, academicYearId = null) => {
  const existing = await db.query(
    'SELECT id, teacher_id, academic_year_id FROM assessments WHERE id = ?',
    [id]
  );
  if (!existing.length) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  if (academicYearId && Number(existing[0].academic_year_id) !== Number(academicYearId)) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (existing[0].teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only update your own assessments');
    }
  }

  if (nama_penilaian !== undefined) {
    const conflict = await db.query(
      'SELECT id FROM assessments WHERE nama_penilaian = ? AND teacher_id = ? AND academic_year_id = ? AND id != ?',
      [nama_penilaian, existing[0].teacher_id, existing[0].academic_year_id, id]
    );
    if (conflict.length) {
      throw ApiError.conflict(`Assessment "${nama_penilaian}" already exists for this teacher in selected academic year`);
    }
  }

  const sets = [];
  const params = [];

  if (nama_penilaian !== undefined) { sets.push('nama_penilaian = ?'); params.push(nama_penilaian); }
  if (bobot !== undefined) { sets.push('bobot = ?'); params.push(bobot); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description || null); }
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);
  await db.query(`UPDATE assessments SET ${sets.join(', ')} WHERE id = ?`, params);

  return getAssessmentById(id, actor, academicYearId || existing[0].academic_year_id);
};

const deleteAssessment = async (id, actor, academicYearId = null) => {
  const existing = await db.query('SELECT id, teacher_id, academic_year_id FROM assessments WHERE id = ?', [id]);
  if (!existing.length) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  if (academicYearId && Number(existing[0].academic_year_id) !== Number(academicYearId)) {
    throw ApiError.notFound(`Assessment with id ${id} not found`);
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (existing[0].teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only delete your own assessments');
    }
  }

  const used = await db.query('SELECT id FROM scores WHERE assessment_id = ? LIMIT 1', [id]);
  if (used.length) {
    throw ApiError.conflict('Assessment is already used in scores');
  }

  await db.query('DELETE FROM assessments WHERE id = ?', [id]);
};

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
};
