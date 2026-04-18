const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const bcrypt = require('bcryptjs');

const guardProtected = (user, action = 'modify') => {
  if (user.is_protected) {
    throw ApiError.forbidden(`Cannot ${action} a protected account`);
  }
};

const getUsers = async ({ page = 1, limit = 10, search = '', dutyCode = '' } = {}) => {
  const offset = (page - 1) * limit;
  const likeSearch = `%${search}%`;

  let countSql = `
    SELECT COUNT(DISTINCT u.id) AS total
    FROM users u
  `;

  let dataSql = `
    SELECT
      u.id,
      u.name,
      u.nip,
      u.email,
      u.role,
      u.is_active,
      u.is_protected,
      u.created_at,
      GROUP_CONCAT(d.code ORDER BY d.code SEPARATOR ',') AS duties
    FROM users u
    LEFT JOIN user_duties ud ON ud.user_id = u.id AND ud.ended_at IS NULL
    LEFT JOIN duties d ON d.id = ud.duty_id
  `;

  const params = [];
  const countParams = [];
  const conditions = [];

  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.nip LIKE ?)');
    params.push(likeSearch, likeSearch, likeSearch);
    countParams.push(likeSearch, likeSearch, likeSearch);
  }

  if (dutyCode) {
    countSql += ' LEFT JOIN user_duties ud ON ud.user_id = u.id AND ud.ended_at IS NULL LEFT JOIN duties d ON d.id = ud.duty_id';
    conditions.push('d.code = ?');
    params.push(dutyCode);
    countParams.push(dutyCode);
  }

  if (conditions.length) {
    const where = ` WHERE ${conditions.join(' AND ')}`;
    countSql += where;
    dataSql += where;
  }

  // Embed LIMIT/OFFSET as validated integers directly — mysql2 pool.execute
  // (prepared statement binary protocol) rejects numeric placeholders for LIMIT.
  dataSql += ` GROUP BY u.id ORDER BY u.name ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

  const [countRow] = await db.query(countSql, countParams);
  const total = countRow.total;

  const rows = await db.query(dataSql, params);

  const users = rows.map((r) => ({
    id: r.id,
    name: r.name,
    nip: r.nip || null,
    email: r.email,
    is_active: !!r.is_active,
    is_protected: !!r.is_protected,
    duties: r.duties ? r.duties.split(',') : [],
    created_at: r.created_at,
  }));

  return {
    users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (id) => {
  const [user] = await db.query(
    `SELECT u.id, u.name, u.nip, u.email, u.is_active, u.is_protected, u.created_at, u.updated_at
     FROM users u
     WHERE u.id = ?`,
    [id]
  );

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const duties = await db.query(
    `SELECT d.code, d.name AS duty_name, ud.assigned_at
     FROM user_duties ud
     INNER JOIN duties d ON d.id = ud.duty_id
     WHERE ud.user_id = ? AND ud.ended_at IS NULL
     ORDER BY d.code ASC`,
    [id]
  );

  const homerooms = await db.query(
    `SELECT ha.id AS homeroom_assignment_id,
            c.id AS class_id, c.code AS class_code, c.name AS class_name,
            ay.id AS academic_year_id, ay.code AS academic_year_code, ay.name AS academic_year_name,
            ha.assigned_at
     FROM homeroom_assignments ha
     INNER JOIN user_duties ud ON ud.id = ha.user_duty_id
     INNER JOIN classes c ON c.id = ha.class_id
     INNER JOIN academic_years ay ON ay.id = ha.academic_year_id
     WHERE ud.user_id = ? AND ha.ended_at IS NULL
     ORDER BY ha.assigned_at DESC`,
    [id]
  );

  const [teacher] = await db.query(
    `SELECT id, nip, name, place_of_birth, date_of_birth, gender, address, phone, email,
            specialization, qualification, user_id, is_active, created_at, updated_at
     FROM teachers
     WHERE user_id = ?
     LIMIT 1`,
    [id]
  );

  return {
    id: user.id,
    name: user.name,
    nip: user.nip || null,
    email: user.email,
    is_active: !!user.is_active,
    is_protected: !!user.is_protected,
    teacher: teacher
      ? {
          id: teacher.id,
          nip: teacher.nip,
          name: teacher.name,
          place_of_birth: teacher.place_of_birth,
          date_of_birth: teacher.date_of_birth,
          gender: teacher.gender,
          address: teacher.address,
          phone: teacher.phone,
          email: teacher.email,
          specialization: teacher.specialization,
          qualification: teacher.qualification,
          user_id: teacher.user_id,
          is_active: !!teacher.is_active,
          created_at: teacher.created_at,
          updated_at: teacher.updated_at,
        }
      : null,
    duties,
    homerooms,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

const updateUser = async (id, { name, nip, email }) => {
  const [existing] = await db.query(
    'SELECT id, is_protected FROM users WHERE id = ?',
    [id]
  );

  if (!existing) {
    throw ApiError.notFound('User not found');
  }

  guardProtected(existing, 'update');

  if (email) {
    const [emailConflict] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, id]
    );

    if (emailConflict) {
      throw ApiError.conflict('Email is already in use by another account');
    }
  }

  if (nip !== undefined && nip !== null) {
    const [nipConflict] = await db.query(
      'SELECT id FROM users WHERE nip = ? AND id != ?',
      [nip, id]
    );

    if (nipConflict) {
      throw ApiError.conflict('NIP is already used by another account');
    }
  }

  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
  }

  if (nip !== undefined) {
    fields.push('nip = ?');
    params.push(nip);
  }

  if (email !== undefined) {
    fields.push('email = ?');
    params.push(email);
  }

  if (!fields.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);

  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  return getUserById(id);
};

const changePassword = async (id, { currentPassword, newPassword }, actorId) => {
  const [user] = await db.query(
    'SELECT id, password, is_protected FROM users WHERE id = ?',
    [id]
  );

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isSelf = actorId === id;

  // When changing own password, current password verification is required.
  if (isSelf) {
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);

  return { id };
};

const toggleStatus = async (id, actorId) => {
  const [user] = await db.query(
    'SELECT id, is_active, is_protected FROM users WHERE id = ?',
    [id]
  );

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  guardProtected(user, 'deactivate');

  if (id === actorId) {
    throw ApiError.badRequest('Cannot change your own active status');
  }

  const newStatus = user.is_active ? 0 : 1;

  await db.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

  return { id, is_active: !!newStatus };
};

const deleteUser = async (id, actorId) => {
  const [user] = await db.query(
    'SELECT id, is_protected FROM users WHERE id = ?',
    [id]
  );

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  guardProtected(user, 'delete');

  if (id === actorId) {
    throw ApiError.badRequest('Cannot delete your own account');
  }

  await db.transaction(async (connection) => {
    // Fetch active user_duty IDs before deletion to resolve FK chain.
    const [dutyRows] = await connection.execute(
      'SELECT id FROM user_duties WHERE user_id = ?',
      [id]
    );

    if (dutyRows.length) {
      const dutyIds = dutyRows.map((r) => r.id);
      const placeholders = dutyIds.map(() => '?').join(',');

      // Delete homeroom_assignments first (FK → user_duties).
      await connection.execute(
        `DELETE FROM homeroom_assignments WHERE user_duty_id IN (${placeholders})`,
        dutyIds
      );

      // Delete user_duties (FK → users).
      await connection.execute(
        'DELETE FROM user_duties WHERE user_id = ?',
        [id]
      );
    }

    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
  });

  return { id };
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  toggleStatus,
  deleteUser,
};
