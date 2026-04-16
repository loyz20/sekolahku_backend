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

const getScoreById = async (id, actor) => {
  const rows = await db.query(
    `SELECT
      sc.id,
      sc.student_id,
      sc.subject_id,
      sc.assessment_id,
      sc.academic_year_id,
      sc.nilai,
      sc.created_at,
      sc.updated_at,
      st.nis AS student_nis,
      st.name AS student_name,
      sb.code AS subject_code,
      sb.name AS subject_name,
      a.nama_penilaian,
      a.bobot,
      ay.code AS academic_year_code,
      ay.name AS academic_year_name,
      a.teacher_id
     FROM scores sc
     INNER JOIN students st ON st.id = sc.student_id
     INNER JOIN subjects sb ON sb.id = sc.subject_id
     INNER JOIN assessments a ON a.id = sc.assessment_id
     INNER JOIN academic_years ay ON ay.id = sc.academic_year_id
     WHERE sc.id = ?`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Score with id ${id} not found`);
  }

  const r = rows[0];
  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (r.teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only access scores for your own assessments');
    }
  }

  return {
    id: r.id,
    student: {
      id: r.student_id,
      nis: r.student_nis,
      name: r.student_name,
    },
    subject: {
      id: r.subject_id,
      code: r.subject_code,
      name: r.subject_name,
    },
    assessment: {
      id: r.assessment_id,
      nama_penilaian: r.nama_penilaian,
      bobot: Number(r.bobot),
    },
    academic_year: {
      id: r.academic_year_id,
      code: r.academic_year_code,
      name: r.academic_year_name,
    },
    nilai: Number(r.nilai),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
};

const getScores = async ({ page = 1, limit = 10, studentId = '', subjectId = '', assessmentId = '', academicYearId = '', actor } = {}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (studentId) {
    conditions.push('sc.student_id = ?');
    params.push(Number(studentId));
    countParams.push(Number(studentId));
  }

  if (subjectId) {
    conditions.push('sc.subject_id = ?');
    params.push(Number(subjectId));
    countParams.push(Number(subjectId));
  }

  if (assessmentId) {
    conditions.push('sc.assessment_id = ?');
    params.push(Number(assessmentId));
    countParams.push(Number(assessmentId));
  }

  if (academicYearId) {
    conditions.push('sc.academic_year_id = ?');
    params.push(Number(academicYearId));
    countParams.push(Number(academicYearId));
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    conditions.push('a.teacher_id = ?');
    params.push(actorTeacherId);
    countParams.push(actorTeacherId);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM scores sc
    INNER JOIN assessments a ON a.id = sc.assessment_id
    ${where}
  `;
  const dataSql = `
    SELECT
      sc.id,
      sc.student_id,
      sc.subject_id,
      sc.assessment_id,
      sc.academic_year_id,
      sc.nilai,
      sc.created_at,
      st.nis AS student_nis,
      st.name AS student_name,
      sb.code AS subject_code,
      sb.name AS subject_name,
      a.nama_penilaian,
      a.bobot,
      ay.code AS academic_year_code,
      ay.name AS academic_year_name
    FROM scores sc
    INNER JOIN students st ON st.id = sc.student_id
    INNER JOIN subjects sb ON sb.id = sc.subject_id
    INNER JOIN assessments a ON a.id = sc.assessment_id
    INNER JOIN academic_years ay ON ay.id = sc.academic_year_id
    ${where}
    ORDER BY st.name ASC, sb.name ASC, a.id ASC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    scores: rows.map((r) => ({
      id: r.id,
      student: {
        id: r.student_id,
        nis: r.student_nis,
        name: r.student_name,
      },
      subject: {
        id: r.subject_id,
        code: r.subject_code,
        name: r.subject_name,
      },
      assessment: {
        id: r.assessment_id,
        nama_penilaian: r.nama_penilaian,
        bobot: Number(r.bobot),
      },
      academic_year: {
        id: r.academic_year_id,
        code: r.academic_year_code,
        name: r.academic_year_name,
      },
      nilai: Number(r.nilai),
      created_at: r.created_at,
    })),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const createScore = async ({ student_id, subject_id, assessment_id, academic_year_id, nilai }, actor) => {
  const [student] = await db.query('SELECT id FROM students WHERE id = ?', [student_id]);
  if (!student) {
    throw ApiError.badRequest('student_id is invalid');
  }

  const [subject] = await db.query('SELECT id FROM subjects WHERE id = ?', [subject_id]);
  if (!subject) {
    throw ApiError.badRequest('subject_id is invalid');
  }

  const [assessment] = await db.query(
    'SELECT id, teacher_id, academic_year_id FROM assessments WHERE id = ? AND is_active = 1',
    [assessment_id]
  );
  if (!assessment) {
    throw ApiError.badRequest('assessment_id is invalid or inactive');
  }

  await ensureAcademicYearExists(academic_year_id);

  if (Number(assessment.academic_year_id) !== Number(academic_year_id)) {
    throw ApiError.badRequest('assessment_id is not in selected academic year');
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (assessment.teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only input score for your own assessments');
    }
  }

  const existing = await db.query(
    'SELECT id FROM scores WHERE student_id = ? AND subject_id = ? AND assessment_id = ? AND academic_year_id = ?',
    [student_id, subject_id, assessment_id, academic_year_id]
  );
  if (existing.length) {
    throw ApiError.conflict('Score for this student, subject, assessment, and academic year already exists');
  }

  const result = await db.query(
    'INSERT INTO scores (student_id, subject_id, assessment_id, academic_year_id, nilai) VALUES (?, ?, ?, ?, ?)',
    [student_id, subject_id, assessment_id, academic_year_id, nilai]
  );

  return getScoreById(result.insertId, actor);
};

const updateScore = async (id, { nilai }, actor) => {
  const existing = await db.query('SELECT id FROM scores WHERE id = ?', [id]);
  if (!existing.length) {
    throw ApiError.notFound(`Score with id ${id} not found`);
  }

  await db.query('UPDATE scores SET nilai = ? WHERE id = ?', [nilai, id]);

  return getScoreById(id, actor);
};

const deleteScore = async (id, actor) => {
  const existing = await db.query(
    `SELECT sc.id, a.teacher_id
     FROM scores sc
     INNER JOIN assessments a ON a.id = sc.assessment_id
     WHERE sc.id = ?`,
    [id]
  );
  if (!existing.length) {
    throw ApiError.notFound(`Score with id ${id} not found`);
  }

  if (isGuruOnly(actor)) {
    const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
    if (existing[0].teacher_id !== actorTeacherId) {
      throw ApiError.forbidden('You can only delete scores for your own assessments');
    }
  }

  await db.query('DELETE FROM scores WHERE id = ?', [id]);
};

module.exports = {
  getScores,
  getScoreById,
  createScore,
  updateScore,
  deleteScore,
};
