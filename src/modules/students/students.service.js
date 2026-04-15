const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getStudents = async ({
  page = 1,
  limit = 10,
  search = '',
  classId = '',
  academicYearId = '',
} = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  const conditions = [];
  const params = [];
  const countParams = [];

  // Main table: students
  let dataSql = `
    SELECT DISTINCT
      s.id,
      s.nis,
      s.name,
      s.email,
      s.is_active,
      s.created_at
    FROM students s
  `;

  let countSql = 'SELECT COUNT(DISTINCT s.id) AS total FROM students s';

  // Add JOIN if filtering by class or academic_year
  if (classId || academicYearId) {
    dataSql += ' INNER JOIN student_enrollments se ON se.student_id = s.id';
    countSql += ' INNER JOIN student_enrollments se ON se.student_id = s.id';
  }

  if (search) {
    conditions.push('(s.nis LIKE ? OR s.name LIKE ? OR s.email LIKE ?)');
    params.push(likeSearch, likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch, likeSearch);
  }

  if (classId) {
    conditions.push('se.class_id = ? AND se.is_active = 1');
    params.push(parseInt(classId, 10));
    countParams.push(parseInt(classId, 10));
  }

  if (academicYearId) {
    conditions.push('se.academic_year_id = ? AND se.is_active = 1');
    params.push(parseInt(academicYearId, 10));
    countParams.push(parseInt(academicYearId, 10));
  }

  if (conditions.length) {
    const where = ` WHERE ${conditions.join(' AND ')}`;
    countSql += where;
    dataSql += where;
  }

  dataSql += ` ORDER BY s.name ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

  const [countRow] = await db.query(countSql, countParams);
  const total = countRow.total;

  const rows = await db.query(dataSql, params);

  return {
    students: rows.map((r) => ({
      id: r.id,
      nis: r.nis,
      name: r.name,
      email: r.email || null,
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

const getStudentById = async (id) => {
  const rows = await db.query(
    `SELECT id, nis, name, place_of_birth, date_of_birth, gender, address, parent_phone, 
            email, user_id, is_active, created_at, updated_at 
     FROM students WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Student with id ${id} not found`);
  }

  const student = rows[0];

  // Get enrollments
  const enrollments = await db.query(
    `SELECT se.id, se.enrollment_date, se.ended_date, se.is_active,
            c.id AS class_id, c.code AS class_code, c.name AS class_name, c.level,
            ay.id AS ay_id, ay.code AS ay_code, ay.name AS ay_name
     FROM student_enrollments se
     INNER JOIN classes c ON c.id = se.class_id
     INNER JOIN academic_years ay ON ay.id = se.academic_year_id
     WHERE se.student_id = ?
     ORDER BY se.enrollment_date DESC`,
    [id]
  );

  return {
    id: student.id,
    nis: student.nis,
    name: student.name,
    place_of_birth: student.place_of_birth || null,
    date_of_birth: student.date_of_birth || null,
    gender: student.gender || null,
    address: student.address || null,
    parent_phone: student.parent_phone || null,
    email: student.email || null,
    user_id: student.user_id || null,
    is_active: !!student.is_active,
    created_at: student.created_at,
    updated_at: student.updated_at,
    enrollments: enrollments.map((e) => ({
      id: e.id,
      class: { id: e.class_id, code: e.class_code, name: e.class_name, level: e.level || null },
      academic_year: { id: e.ay_id, code: e.ay_code, name: e.ay_name },
      enrollment_date: e.enrollment_date,
      ended_date: e.ended_date || null,
      is_active: !!e.is_active,
    })),
  };
};

const createStudent = async ({
  nis,
  name,
  place_of_birth = null,
  date_of_birth = null,
  gender = null,
  address = null,
  parent_phone = null,
  email = null,
  user_id = null,
}) => {
  // Check NIS uniqueness
  const existing = await db.query('SELECT id FROM students WHERE nis = ?', [nis]);
  if (existing.length) {
    throw ApiError.conflict(`Student with NIS "${nis}" already exists`);
  }

  // Check email uniqueness if provided
  if (email) {
    const emailExists = await db.query('SELECT id FROM students WHERE email = ?', [email]);
    if (emailExists.length) {
      throw ApiError.conflict(`Email "${email}" is already in use`);
    }
  }

  const result = await db.query(
    `INSERT INTO students (nis, name, place_of_birth, date_of_birth, gender, address, parent_phone, email, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nis, name, place_of_birth, date_of_birth, gender, address, parent_phone, email || null, user_id || null]
  );

  return getStudentById(result.insertId);
};

const updateStudent = async (id, { nis, name, place_of_birth, date_of_birth, gender, address, parent_phone, email }) => {
  const existing = await db.query('SELECT id FROM students WHERE id = ?', [id]);
  if (!existing.length) {
    throw ApiError.notFound(`Student with id ${id} not found`);
  }

  if (nis !== undefined) {
    const nisConflict = await db.query('SELECT id FROM students WHERE nis = ? AND id != ?', [nis, id]);
    if (nisConflict.length) {
      throw ApiError.conflict(`NIS "${nis}" is already in use`);
    }
  }

  if (email !== undefined && email !== null) {
    const emailConflict = await db.query('SELECT id FROM students WHERE email = ? AND id != ?', [email, id]);
    if (emailConflict.length) {
      throw ApiError.conflict(`Email "${email}" is already in use`);
    }
  }

  const sets = [];
  const params = [];

  if (nis !== undefined) { sets.push('nis = ?'); params.push(nis); }
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (place_of_birth !== undefined) { sets.push('place_of_birth = ?'); params.push(place_of_birth || null); }
  if (date_of_birth !== undefined) { sets.push('date_of_birth = ?'); params.push(date_of_birth || null); }
  if (gender !== undefined) { sets.push('gender = ?'); params.push(gender || null); }
  if (address !== undefined) { sets.push('address = ?'); params.push(address || null); }
  if (parent_phone !== undefined) { sets.push('parent_phone = ?'); params.push(parent_phone || null); }
  if (email !== undefined) { sets.push('email = ?'); params.push(email); }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);
  await db.query(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`, params);

  return getStudentById(id);
};

const enrollStudent = async (studentId, classId, academicYearId) => {
  return db.transaction(async (connection) => {
    // Verify student exists
    const [students] = await connection.execute('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!students.length) {
      throw ApiError.notFound(`Student with id ${studentId} not found`);
    }

    // Verify class exists
    const [classes] = await connection.execute('SELECT id, name FROM classes WHERE id = ?', [classId]);
    if (!classes.length) {
      throw ApiError.notFound(`Class with id ${classId} not found`);
    }

    // Verify academic year exists
    const [ays] = await connection.execute('SELECT id, name FROM academic_years WHERE id = ?', [academicYearId]);
    if (!ays.length) {
      throw ApiError.notFound(`Academic year with id ${academicYearId} not found`);
    }

    // Check if already enrolled (active)
    const [activeEnrollment] = await connection.execute(
      'SELECT id FROM student_enrollments WHERE student_id = ? AND class_id = ? AND academic_year_id = ? AND ended_date IS NULL',
      [studentId, classId, academicYearId]
    );

    if (activeEnrollment.length) {
      throw ApiError.conflict('Student is already enrolled in this class for this academic year');
    }

    // Insert enrollment
    const [result] = await connection.execute(
      'INSERT INTO student_enrollments (student_id, class_id, academic_year_id) VALUES (?, ?, ?)',
      [studentId, classId, academicYearId]
    );

    return {
      id: result.insertId,
      student_id: studentId,
      class: { id: classId, name: classes[0].name },
      academic_year: { id: academicYearId, name: ays[0].name },
      enrollment_date: new Date(),
    };
  });
};

const disenrollStudent = async (enrollmentId) => {
  const existing = await db.query('SELECT id, ended_date FROM student_enrollments WHERE id = ?', [enrollmentId]);

  if (!existing.length) {
    throw ApiError.notFound(`Enrollment with id ${enrollmentId} not found`);
  }

  if (existing[0].ended_date) {
    throw ApiError.conflict('Enrollment is already ended');
  }

  await db.query('UPDATE student_enrollments SET ended_date = CURRENT_TIMESTAMP WHERE id = ?', [enrollmentId]);
};

const toggleStudentStatus = async (id) => {
  const existing = await db.query('SELECT id, is_active FROM students WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Student with id ${id} not found`);
  }

  const newStatus = existing[0].is_active ? 0 : 1;
  await db.query('UPDATE students SET is_active = ? WHERE id = ?', [newStatus, id]);

  return getStudentById(id);
};

const deleteStudent = async (id) => {
  const existing = await db.query('SELECT id FROM students WHERE id = ?', [id]);

  if (!existing.length) {
    throw ApiError.notFound(`Student with id ${id} not found`);
  }

  // Delete enrollments first
  await db.query('DELETE FROM student_enrollments WHERE student_id = ?', [id]);
  // Delete student
  await db.query('DELETE FROM students WHERE id = ?', [id]);
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  enrollStudent,
  disenrollStudent,
  toggleStudentStatus,
  deleteStudent,
};
