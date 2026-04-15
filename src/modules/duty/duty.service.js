const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getDutyByCode = async (connection, dutyCode) => {
  const [rows] = await connection.execute('SELECT id, code, name FROM duties WHERE code = ?', [dutyCode]);

  if (!rows.length) {
    throw ApiError.notFound(`Duty with code "${dutyCode}" not found`);
  }

  return rows[0];
};

const ensureUserExists = async (connection, userId) => {
  const [rows] = await connection.execute('SELECT id, name, email, is_protected FROM users WHERE id = ?', [userId]);

  if (!rows.length) {
    throw ApiError.notFound(`User with id ${userId} not found`);
  }

  return rows[0];
};

const guardProtectedUser = (user, action = 'modify') => {
  if (user.is_protected) {
    throw ApiError.forbidden(`Cannot ${action} a protected account`);
  }
};

const ensureClassExists = async (connection, classId) => {
  const [rows] = await connection.execute('SELECT id, code, name FROM classes WHERE id = ?', [classId]);

  if (!rows.length) {
    throw ApiError.notFound(`Class with id ${classId} not found`);
  }

  return rows[0];
};

const ensureAcademicYearExists = async (connection, academicYearId) => {
  const [rows] = await connection.execute('SELECT id, code, name FROM academic_years WHERE id = ?', [academicYearId]);

  if (!rows.length) {
    throw ApiError.notFound(`Academic year with id ${academicYearId} not found`);
  }

  return rows[0];
};

const getDuties = async ({ page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;

  const duties = await db.query(
    `SELECT id, code, name, description FROM duties ORDER BY code ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    []
  );

  const [countRow] = await db.query('SELECT COUNT(*) as total FROM duties', []);
  const total = countRow.total;

  return {
    duties,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const assignDuty = async ({ targetUserId, dutyCode, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    const user = await ensureUserExists(connection, targetUserId);
    const duty = await getDutyByCode(connection, dutyCode);

    const [activeRows] = await connection.execute(
      'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL',
      [targetUserId, duty.id]
    );

    if (activeRows.length) {
      throw ApiError.conflict(`User already has active duty "${dutyCode}"`);
    }

    const [insertResult] = await connection.execute(
      'INSERT INTO user_duties (user_id, duty_id, assigned_by, notes) VALUES (?, ?, ?, ?)',
      [targetUserId, duty.id, actorUserId || null, notes]
    );

    return {
      assignmentId: insertResult.insertId,
      user,
      duty,
      assignedBy: actorUserId || null,
      notes,
    };
  });
};

const revokeDuty = async ({ targetUserId, dutyCode, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    const user = await ensureUserExists(connection, targetUserId);
    guardProtectedUser(user, 'revoke duties from');

    const duty = await getDutyByCode(connection, dutyCode);

    const [activeRows] = await connection.execute(
      'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL ORDER BY assigned_at DESC LIMIT 1',
      [targetUserId, duty.id]
    );

    if (!activeRows.length) {
      throw ApiError.notFound(`No active duty "${dutyCode}" found for user ${targetUserId}`);
    }

    await connection.execute(
      'UPDATE user_duties SET ended_at = CURRENT_TIMESTAMP, ended_by = ?, notes = COALESCE(?, notes) WHERE id = ?',
      [actorUserId || null, notes, activeRows[0].id]
    );

    return {
      assignmentId: activeRows[0].id,
      duty,
      revokedBy: actorUserId || null,
    };
  });
};

const ensureActiveWaliKelasDuty = async (connection, targetUserId, actorUserId) => {
  const waliDuty = await getDutyByCode(connection, 'wali_kelas');

  const [activeRows] = await connection.execute(
    'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL ORDER BY assigned_at DESC LIMIT 1',
    [targetUserId, waliDuty.id]
  );

  if (activeRows.length) {
    return activeRows[0].id;
  }

  const [insertResult] = await connection.execute(
    'INSERT INTO user_duties (user_id, duty_id, assigned_by, notes) VALUES (?, ?, ?, ?)',
    [targetUserId, waliDuty.id, actorUserId || null, 'Auto-assigned from homeroom assignment']
  );

  return insertResult.insertId;
};

const assignHomeroom = async ({ targetUserId, classId, academicYearId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    await ensureUserExists(connection, targetUserId);
    const classInfo = await ensureClassExists(connection, classId);
    const yearInfo = await ensureAcademicYearExists(connection, academicYearId);

    const [conflictRows] = await connection.execute(
      'SELECT id FROM homeroom_assignments WHERE class_id = ? AND academic_year_id = ? AND ended_at IS NULL LIMIT 1',
      [classId, academicYearId]
    );

    if (conflictRows.length) {
      throw ApiError.conflict('Class already has an active homeroom teacher in this academic year');
    }

    const userDutyId = await ensureActiveWaliKelasDuty(connection, targetUserId, actorUserId);

    const [alreadyRows] = await connection.execute(
      'SELECT id FROM homeroom_assignments WHERE user_duty_id = ? AND class_id = ? AND academic_year_id = ? AND ended_at IS NULL LIMIT 1',
      [userDutyId, classId, academicYearId]
    );

    if (alreadyRows.length) {
      throw ApiError.conflict('Same active homeroom assignment already exists');
    }

    const [insertResult] = await connection.execute(
      'INSERT INTO homeroom_assignments (user_duty_id, class_id, academic_year_id, assigned_by, notes) VALUES (?, ?, ?, ?, ?)',
      [userDutyId, classId, academicYearId, actorUserId || null, notes]
    );

    return {
      homeroomAssignmentId: insertResult.insertId,
      userDutyId,
      class: classInfo,
      academicYear: yearInfo,
    };
  });
};

const revokeHomeroom = async ({ classId, academicYearId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    const [activeRows] = await connection.execute(
      'SELECT id FROM homeroom_assignments WHERE class_id = ? AND academic_year_id = ? AND ended_at IS NULL ORDER BY assigned_at DESC LIMIT 1',
      [classId, academicYearId]
    );

    if (!activeRows.length) {
      throw ApiError.notFound('No active homeroom assignment found for this class and academic year');
    }

    await connection.execute(
      'UPDATE homeroom_assignments SET ended_at = CURRENT_TIMESTAMP, ended_by = ?, notes = COALESCE(?, notes) WHERE id = ?',
      [actorUserId || null, notes, activeRows[0].id]
    );

    return {
      homeroomAssignmentId: activeRows[0].id,
      revokedBy: actorUserId || null,
    };
  });
};

const getUserActiveAssignments = async (userId) => {
  const duties = await db.query(
    `SELECT ud.id AS assignment_id, d.code AS duty_code, d.name AS duty_name, ud.assigned_at, ud.notes
     FROM user_duties ud
     INNER JOIN duties d ON d.id = ud.duty_id
     WHERE ud.user_id = ? AND ud.ended_at IS NULL
     ORDER BY d.code ASC`,
    [userId]
  );

  const homerooms = await db.query(
    `SELECT ha.id AS homeroom_assignment_id, c.id AS class_id, c.code AS class_code, c.name AS class_name,
            ay.id AS academic_year_id, ay.code AS academic_year_code, ay.name AS academic_year_name,
            ha.assigned_at
     FROM homeroom_assignments ha
     INNER JOIN user_duties ud ON ud.id = ha.user_duty_id
     INNER JOIN classes c ON c.id = ha.class_id
     INNER JOIN academic_years ay ON ay.id = ha.academic_year_id
     WHERE ud.user_id = ? AND ha.ended_at IS NULL
     ORDER BY ha.assigned_at DESC`,
    [userId]
  );

  return { duties, homerooms };
};

module.exports = {
  getDuties,
  assignDuty,
  revokeDuty,
  assignHomeroom,
  revokeHomeroom,
  getUserActiveAssignments,
};
