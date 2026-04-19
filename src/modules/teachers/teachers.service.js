const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const bcrypt = require('bcryptjs');

const TEACHER_ACCOUNT_EMAIL_DOMAIN = 'sman3tasikmalaya.sch.id';

/**
 * Get all teachers with pagination and optional filtering
 */
const getTeachers = async ({ page = 1, limit = 10, search = '', specialization = '' } = {}) => {
  const offset = (page - 1) * limit;
  const whereConditions = [];
  let params = [];

  if (search) {
    whereConditions.push('(t.nip LIKE ? OR t.name LIKE ? OR t.email LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (specialization) {
    whereConditions.push('t.specialization LIKE ?');
    params.push(`%${specialization}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get teachers
  const teachers = await db.query(
    `SELECT id, nip, name, email, specialization, is_active, created_at 
     FROM teachers t 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  // Get total count
  const [countRow] = await db.query(
    `SELECT COUNT(*) as total FROM teachers t ${whereClause}`,
    params
  );

  const total = countRow.total;
  return {
    teachers,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get teacher by ID with duties and homeroom assignments
 */
const getTeacherById = async (teacherId) => {
  const teachers = await db.query(
    `SELECT id, nip, name, place_of_birth, date_of_birth, gender, address, phone, email, 
            specialization, qualification, user_id, is_active, created_at, updated_at
     FROM teachers 
     WHERE id = ?`,
    [teacherId]
  );

  if (teachers.length === 0) {
    return null;
  }

  const teacher = teachers[0];
  const userId = teacher.user_id;

  if (!userId) {
    return {
      ...teacher,
      duties: [],
      homerooms: [],
    };
  }

  // Get duties
  const duties = await db.query(
    `SELECT d.code, d.name as duty_name, ud.assigned_at
     FROM user_duties ud
     JOIN duties d ON ud.duty_id = d.id
     WHERE ud.user_id = ? AND ud.ended_at IS NULL
     ORDER BY ud.assigned_at DESC`,
    [userId]
  );

  // Get homeroom assignments
  const homerooms = await db.query(
    `SELECT ha.id as homeroom_assignment_id, c.id as class_id, c.code as class_code, c.name as class_name,
            ay.id as academic_year_id, ay.code as academic_year_code, ay.name as academic_year_name, ha.assigned_at
     FROM homeroom_assignments ha
     JOIN user_duties ud ON ud.id = ha.user_duty_id
     JOIN classes c ON ha.class_id = c.id
     JOIN academic_years ay ON ha.academic_year_id = ay.id
     WHERE ud.user_id = ? AND ha.ended_at IS NULL
     ORDER BY ha.assigned_at DESC`,
    [userId]
  );

  return {
    ...teacher,
    duties: duties || [],
    homerooms: homerooms || [],
  };
};

/**
 * Create a new teacher
 */
const createTeacher = async ({
  nip,
  name,
  place_of_birth,
  date_of_birth,
  gender,
  address,
  phone,
  email,
  specialization,
  qualification,
  user_id,
}) => {
  const existingNip = await db.query('SELECT id FROM teachers WHERE nip = ?', [nip]);
  if (existingNip.length) {
    throw ApiError.conflict(`NIP "${nip}" already exists`);
  }

  if (email) {
    const existingEmail = await db.query('SELECT id FROM teachers WHERE email = ?', [email]);
    if (existingEmail.length) {
      throw ApiError.conflict(`Email "${email}" already exists`);
    }
  }

  if (user_id) {
    const userExists = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!userExists.length) {
      throw ApiError.badRequest('user_id is invalid');
    }

    const userAlreadyLinked = await db.query('SELECT id FROM teachers WHERE user_id = ?', [user_id]);
    if (userAlreadyLinked.length) {
      throw ApiError.conflict(`User id ${user_id} is already linked to another teacher`);
    }
  }

  // Auto-create a login account if user_id is not provided.
  // Default password is set to NIP so admin can share credentials immediately.
  if (!user_id) {
    const normalizedNip = String(nip).trim();
    let finalEmail = `${normalizedNip}@${TEACHER_ACCOUNT_EMAIL_DOMAIN}`;

    const existingUserEmail = await db.query('SELECT id FROM users WHERE email = ?', [finalEmail]);
    if (existingUserEmail.length) {
      finalEmail = `${normalizedNip}.${Date.now()}@${TEACHER_ACCOUNT_EMAIL_DOMAIN}`;
    }

    const existingUserNip = await db.query('SELECT id FROM users WHERE nip = ?', [nip]);
    if (existingUserNip.length) {
      throw ApiError.conflict(`NIP "${nip}" already exists in users`);
    }

    const hashedPassword = await bcrypt.hash(String(nip), 12);

    const teacherId = await db.transaction(async (connection) => {
      const [guruDuties] = await connection.execute(
        'SELECT id FROM duties WHERE code = ? LIMIT 1',
        ['guru']
      );

      if (!guruDuties.length) {
        throw ApiError.internal('Default duty "guru" is not configured');
      }

      const [userInsert] = await connection.execute(
        'INSERT INTO users (name, nip, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [name, nip, finalEmail, hashedPassword, 'guru']
      );

      await connection.execute(
        'INSERT INTO user_duties (user_id, duty_id) VALUES (?, ?)',
        [userInsert.insertId, guruDuties[0].id]
      );

      const [teacherInsert] = await connection.execute(
        `INSERT INTO teachers (nip, name, place_of_birth, date_of_birth, gender, address, phone, email, specialization, qualification, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nip,
          name,
          place_of_birth || null,
          date_of_birth || null,
          gender || null,
          address || null,
          phone || null,
          finalEmail || null,
          specialization || null,
          qualification || null,
          userInsert.insertId,
        ]
      );

      return teacherInsert.insertId;
    });

    const teacher = await getTeacherById(teacherId);
    return {
      ...teacher,
      account_info: {
        auto_created: true,
        email: finalEmail,
        default_password: String(nip),
      },
    };
  }

  const result = await db.query(
    `INSERT INTO teachers (nip, name, place_of_birth, date_of_birth, gender, address, phone, email, specialization, qualification, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nip, name, place_of_birth || null, date_of_birth || null, gender || null, address || null, phone || null, email || null, specialization || null, qualification || null, user_id || null]
  );

  return getTeacherById(result.insertId);
};

/**
 * Update teacher profile
 */
const updateTeacher = async (
  teacherId,
  {
    nip,
    name,
    place_of_birth,
    date_of_birth,
    gender,
    address,
    phone,
    email,
    specialization,
    qualification,
    user_id,
  }
) => {
  const existing = await db.query('SELECT id FROM teachers WHERE id = ?', [teacherId]);
  if (!existing.length) {
    throw ApiError.notFound('Teacher not found');
  }

  if (nip !== undefined) {
    const nipConflict = await db.query('SELECT id FROM teachers WHERE nip = ? AND id != ?', [nip, teacherId]);
    if (nipConflict.length) {
      throw ApiError.conflict(`NIP "${nip}" already exists`);
    }
  }

  if (email !== undefined && email !== null) {
    const emailConflict = await db.query('SELECT id FROM teachers WHERE email = ? AND id != ?', [email, teacherId]);
    if (emailConflict.length) {
      throw ApiError.conflict(`Email "${email}" already exists`);
    }
  }

  if (user_id !== undefined && user_id !== null) {
    const userExists = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!userExists.length) {
      throw ApiError.badRequest('user_id is invalid');
    }

    const linkedConflict = await db.query('SELECT id FROM teachers WHERE user_id = ? AND id != ?', [user_id, teacherId]);
    if (linkedConflict.length) {
      throw ApiError.conflict(`User id ${user_id} is already linked to another teacher`);
    }
  }

  const updates = [];
  const values = [];

  if (nip !== undefined) {
    updates.push('nip = ?');
    values.push(nip);
  }
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (place_of_birth !== undefined) {
    updates.push('place_of_birth = ?');
    values.push(place_of_birth || null);
  }
  if (date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    values.push(date_of_birth || null);
  }
  if (gender !== undefined) {
    updates.push('gender = ?');
    values.push(gender || null);
  }
  if (address !== undefined) {
    updates.push('address = ?');
    values.push(address || null);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    values.push(phone || null);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email || null);
  }
  if (specialization !== undefined) {
    updates.push('specialization = ?');
    values.push(specialization || null);
  }
  if (qualification !== undefined) {
    updates.push('qualification = ?');
    values.push(qualification || null);
  }
  if (user_id !== undefined) {
    updates.push('user_id = ?');
    values.push(user_id || null);
  }

  if (updates.length === 0) {
    return getTeacherById(teacherId);
  }

  values.push(teacherId);
  await db.query(
    `UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return getTeacherById(teacherId);
};

/**
 * Toggle teacher active/inactive status
 */
const toggleTeacherStatus = async (teacherId) => {
  const teacher = await db.query('SELECT is_active FROM teachers WHERE id = ?', [teacherId]);

  if (teacher.length === 0) {
    throw ApiError.notFound('Teacher not found');
  }

  const newStatus = teacher[0].is_active ? 0 : 1;
  await db.query('UPDATE teachers SET is_active = ? WHERE id = ?', [newStatus, teacherId]);

  const updated = await db.query(
    'SELECT id, is_active, updated_at FROM teachers WHERE id = ?',
    [teacherId]
  );

  return updated[0];
};

/**
 * Delete teacher
 */
const deleteTeacher = async (teacherId) => {
  const existing = await db.query('SELECT id FROM teachers WHERE id = ?', [teacherId]);
  if (!existing.length) {
    throw ApiError.notFound('Teacher not found');
  }

  await db.query('DELETE FROM teachers WHERE id = ?', [teacherId]);
  return true;
};

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  toggleTeacherStatus,
  deleteTeacher,
};
