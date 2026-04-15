const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const ensureClassExists = async (connection, classId) => {
  const [rows] = await connection.execute('SELECT id, code, name FROM classes WHERE id = ?', [classId]);
  if (!rows.length) throw ApiError.notFound(`Class with id ${classId} not found`);
  return rows[0];
};

const ensureAcademicYearExists = async (connection, academicYearId) => {
  const [rows] = await connection.execute(
    'SELECT id, code, name FROM academic_years WHERE id = ?',
    [academicYearId]
  );
  if (!rows.length) throw ApiError.notFound(`Academic year with id ${academicYearId} not found`);
  return rows[0];
};

const ensureSubjectExists = async (connection, subjectId) => {
  const [rows] = await connection.execute(
    'SELECT id, code, name, is_active FROM subjects WHERE id = ?',
    [subjectId]
  );
  if (!rows.length) throw ApiError.notFound(`Subject with id ${subjectId} not found`);
  if (!rows[0].is_active) throw ApiError.badRequest('Subject is inactive');
  return rows[0];
};

const ensureTeacherExists = async (connection, teacherId) => {
  const [rows] = await connection.execute(
    'SELECT id, name, nip, is_active FROM teachers WHERE id = ?',
    [teacherId]
  );
  if (!rows.length) throw ApiError.notFound(`Teacher with id ${teacherId} not found`);
  if (!rows[0].is_active) throw ApiError.badRequest('Teacher is inactive');
  return rows[0];
};

const ensureStudentExists = async (studentId) => {
  const rows = await db.query(
    'SELECT id, nis, name, user_id, is_active FROM students WHERE id = ?',
    [studentId]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Student with id ${studentId} not found`);
  }

  if (!rows[0].is_active) {
    throw ApiError.badRequest('Student is inactive');
  }

  return rows[0];
};

const getRequesterDuties = (requester) => {
  if (!requester) return [];
  if (Array.isArray(requester.duties)) return requester.duties;
  if (typeof requester.role === 'string' && requester.role.length > 0) return [requester.role];
  return [];
};

const assertStudentScheduleAccess = (student, requester) => {
  const duties = getRequesterDuties(requester);
  const isPrivileged = duties.includes('admin') || duties.includes('kepala_sekolah') || duties.includes('superadmin');

  if (isPrivileged) return;

  if (!student.user_id || student.user_id !== requester.id) {
    throw ApiError.forbidden('You can only access your own schedule');
  }
};

const ensureAcademicYearExistsByDb = async (academicYearId) => {
  const rows = await db.query('SELECT id, code, name FROM academic_years WHERE id = ?', [academicYearId]);

  if (!rows.length) {
    throw ApiError.notFound(`Academic year with id ${academicYearId} not found`);
  }

  return rows[0];
};

const ensureClassSubjectActive = async (connection, classSubjectId) => {
  const [rows] = await connection.execute(
    `SELECT cs.id, cs.class_id, cs.subject_id, cs.academic_year_id,
            c.code AS class_code, c.name AS class_name,
            s.code AS subject_code, s.name AS subject_name,
            ay.code AS ay_code, ay.name AS ay_name
     FROM class_subjects cs
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     WHERE cs.id = ? AND cs.ended_at IS NULL`,
    [classSubjectId]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Active class subject with id ${classSubjectId} not found`);
  }

  return rows[0];
};

const ensureTeachingAssignmentActive = async (connection, assignmentId) => {
  const [rows] = await connection.execute(
    `SELECT ta.id, ta.class_subject_id, ta.teacher_id,
            cs.class_id, cs.subject_id, cs.academic_year_id,
            t.name AS teacher_name, t.nip AS teacher_nip,
            c.code AS class_code, c.name AS class_name,
            s.code AS subject_code, s.name AS subject_name,
            ay.code AS ay_code, ay.name AS ay_name
     FROM teaching_assignments ta
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     WHERE ta.id = ? AND ta.ended_at IS NULL AND cs.ended_at IS NULL`,
    [assignmentId]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Active teaching assignment with id ${assignmentId} not found`);
  }

  return rows[0];
};

const ensureSlotExists = async (slotId) => {
  const rows = await db.query('SELECT id FROM schedule_slots WHERE id = ?', [slotId]);
  if (!rows.length) throw ApiError.notFound(`Schedule slot with id ${slotId} not found`);
};

const validateTimeRange = (startTime, endTime) => {
  if (startTime >= endTime) {
    throw ApiError.badRequest('start_time must be earlier than end_time');
  }
};

const checkScheduleConflicts = async (
  connection,
  { assignmentId, teacherId, classId, academicYearId, dayOfWeek, startTime, endTime, room, excludeSlotId = null }
) => {
  const exclusion = excludeSlotId ? ' AND ss.id != ?' : '';
  const overlapPredicate = 'ss.day_of_week = ? AND ss.start_time < ? AND ss.end_time > ?';

  const teacherSql = `
    SELECT ss.id
    FROM schedule_slots ss
    INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
    INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
    WHERE ta.teacher_id = ?
      AND cs.academic_year_id = ?
      AND ${overlapPredicate}
      ${exclusion}
    LIMIT 1
  `;

  const classSql = `
    SELECT ss.id
    FROM schedule_slots ss
    INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
    INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
    WHERE cs.class_id = ?
      AND cs.academic_year_id = ?
      AND ${overlapPredicate}
      ${exclusion}
    LIMIT 1
  `;

  const roomSql = `
    SELECT ss.id
    FROM schedule_slots ss
    INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
    INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
    WHERE ss.room = ?
      AND cs.academic_year_id = ?
      AND ${overlapPredicate}
      ${exclusion}
    LIMIT 1
  `;

  const teacherParams = [teacherId, academicYearId, dayOfWeek, endTime, startTime];
  const classParams = [classId, academicYearId, dayOfWeek, endTime, startTime];

  if (excludeSlotId) {
    teacherParams.push(excludeSlotId);
    classParams.push(excludeSlotId);
  }

  const [teacherConflict] = await connection.execute(teacherSql, teacherParams);
  if (teacherConflict.length) {
    throw ApiError.conflict('Teacher has a time conflict on the selected slot');
  }

  const [classConflict] = await connection.execute(classSql, classParams);
  if (classConflict.length) {
    throw ApiError.conflict('Class has a time conflict on the selected slot');
  }

  if (room) {
    const roomParams = [room, academicYearId, dayOfWeek, endTime, startTime];
    if (excludeSlotId) roomParams.push(excludeSlotId);

    const [roomConflict] = await connection.execute(roomSql, roomParams);
    if (roomConflict.length) {
      throw ApiError.conflict('Room has a time conflict on the selected slot');
    }
  }

  return assignmentId;
};

const addClassSubject = async ({ classId, subjectId, academicYearId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    await ensureClassExists(connection, classId);
    await ensureSubjectExists(connection, subjectId);
    await ensureAcademicYearExists(connection, academicYearId);

    const [activeRows] = await connection.execute(
      `SELECT id FROM class_subjects
       WHERE class_id = ? AND subject_id = ? AND academic_year_id = ? AND ended_at IS NULL
       LIMIT 1`,
      [classId, subjectId, academicYearId]
    );

    if (activeRows.length) {
      throw ApiError.conflict('Subject is already active for this class and academic year');
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, assigned_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [classId, subjectId, academicYearId, actorUserId || null, notes]
    );

    const [rows] = await connection.execute(
      `SELECT cs.id, cs.class_id, cs.subject_id, cs.academic_year_id, cs.assigned_at,
              c.code AS class_code, c.name AS class_name,
              s.code AS subject_code, s.name AS subject_name,
              ay.code AS ay_code, ay.name AS ay_name
       FROM class_subjects cs
       INNER JOIN classes c ON c.id = cs.class_id
       INNER JOIN subjects s ON s.id = cs.subject_id
       INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
       WHERE cs.id = ?`,
      [insertResult.insertId]
    );

    return rows[0];
  });
};

const revokeClassSubject = async ({ classSubjectId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    const [activeRows] = await connection.execute(
      'SELECT id FROM class_subjects WHERE id = ? AND ended_at IS NULL',
      [classSubjectId]
    );

    if (!activeRows.length) {
      throw ApiError.notFound('Active class subject not found');
    }

    const [assignmentRows] = await connection.execute(
      'SELECT id FROM teaching_assignments WHERE class_subject_id = ? AND ended_at IS NULL LIMIT 1',
      [classSubjectId]
    );

    if (assignmentRows.length) {
      throw ApiError.conflict('Cannot revoke class subject while active teaching assignment exists');
    }

    await connection.execute(
      `UPDATE class_subjects
       SET ended_at = CURRENT_TIMESTAMP, ended_by = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [actorUserId || null, notes, classSubjectId]
    );

    return { classSubjectId };
  });
};

const getClassSubjects = async ({ classId, academicYearId, subjectId, includeInactive = false }) => {
  const conditions = [];
  const params = [];

  if (classId) {
    conditions.push('cs.class_id = ?');
    params.push(classId);
  }

  if (academicYearId) {
    conditions.push('cs.academic_year_id = ?');
    params.push(academicYearId);
  }

  if (subjectId) {
    conditions.push('cs.subject_id = ?');
    params.push(subjectId);
  }

  if (!includeInactive) {
    conditions.push('cs.ended_at IS NULL');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await db.query(
    `SELECT cs.id, cs.class_id, cs.subject_id, cs.academic_year_id, cs.assigned_at, cs.ended_at,
            c.code AS class_code, c.name AS class_name,
            s.code AS subject_code, s.name AS subject_name,
            ay.code AS ay_code, ay.name AS ay_name
     FROM class_subjects cs
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     ${where}
     ORDER BY c.level ASC, c.name ASC, s.name ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    class: { id: row.class_id, code: row.class_code, name: row.class_name },
    subject: { id: row.subject_id, code: row.subject_code, name: row.subject_name },
    academic_year: { id: row.academic_year_id, code: row.ay_code, name: row.ay_name },
    assigned_at: row.assigned_at,
    ended_at: row.ended_at,
    is_active: row.ended_at === null,
  }));
};

const assignTeacher = async ({ classSubjectId, teacherId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    await ensureClassSubjectActive(connection, classSubjectId);
    await ensureTeacherExists(connection, teacherId);

    const [activeRows] = await connection.execute(
      'SELECT id FROM teaching_assignments WHERE class_subject_id = ? AND ended_at IS NULL LIMIT 1',
      [classSubjectId]
    );

    if (activeRows.length) {
      throw ApiError.conflict('Class subject already has an active teacher assignment');
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO teaching_assignments (class_subject_id, teacher_id, assigned_by, notes)
       VALUES (?, ?, ?, ?)`,
      [classSubjectId, teacherId, actorUserId || null, notes]
    );

    const [rows] = await connection.execute(
      `SELECT ta.id, ta.class_subject_id, ta.teacher_id, ta.assigned_at,
              t.name AS teacher_name, t.nip AS teacher_nip,
              cs.class_id, c.code AS class_code, c.name AS class_name,
              cs.subject_id, s.code AS subject_code, s.name AS subject_name,
              cs.academic_year_id, ay.code AS ay_code, ay.name AS ay_name
       FROM teaching_assignments ta
       INNER JOIN teachers t ON t.id = ta.teacher_id
       INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
       INNER JOIN classes c ON c.id = cs.class_id
       INNER JOIN subjects s ON s.id = cs.subject_id
       INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
       WHERE ta.id = ?`,
      [insertResult.insertId]
    );

    return rows[0];
  });
};

const revokeTeacherAssignment = async ({ assignmentId, actorUserId, notes = null }) => {
  return db.transaction(async (connection) => {
    const [activeRows] = await connection.execute(
      'SELECT id FROM teaching_assignments WHERE id = ? AND ended_at IS NULL',
      [assignmentId]
    );

    if (!activeRows.length) {
      throw ApiError.notFound('Active teaching assignment not found');
    }

    const [slotRows] = await connection.execute(
      'SELECT id FROM schedule_slots WHERE teaching_assignment_id = ? LIMIT 1',
      [assignmentId]
    );

    if (!slotRows.length) {
      await connection.execute(
        `UPDATE teaching_assignments
         SET ended_at = CURRENT_TIMESTAMP, ended_by = ?, notes = COALESCE(?, notes)
         WHERE id = ?`,
        [actorUserId || null, notes, assignmentId]
      );

      return { assignmentId };
    }

    await connection.execute(
      `UPDATE teaching_assignments
       SET ended_at = CURRENT_TIMESTAMP, ended_by = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [actorUserId || null, notes, assignmentId]
    );

    return { assignmentId };
  });
};

const deleteTeachingAssignmentPermanent = async (assignmentId) => {
  return db.transaction(async (connection) => {
    const [rows] = await connection.execute(
      'SELECT id FROM teaching_assignments WHERE id = ? LIMIT 1',
      [assignmentId]
    );

    if (!rows.length) {
      throw ApiError.notFound('Teaching assignment not found');
    }

    await connection.execute('DELETE FROM schedule_slots WHERE teaching_assignment_id = ?', [assignmentId]);
    await connection.execute('DELETE FROM teaching_assignments WHERE id = ?', [assignmentId]);

    return { assignmentId };
  });
};

const getTeachingAssignments = async ({ classId, academicYearId, teacherId, includeInactive = false }) => {
  const conditions = [];
  const params = [];

  if (classId) {
    conditions.push('cs.class_id = ?');
    params.push(classId);
  }

  if (academicYearId) {
    conditions.push('cs.academic_year_id = ?');
    params.push(academicYearId);
  }

  if (teacherId) {
    conditions.push('ta.teacher_id = ?');
    params.push(teacherId);
  }

  if (!includeInactive) {
    conditions.push('ta.ended_at IS NULL');
    conditions.push('cs.ended_at IS NULL');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await db.query(
    `SELECT ta.id, ta.class_subject_id, ta.teacher_id, ta.assigned_at, ta.ended_at,
            t.name AS teacher_name, t.nip AS teacher_nip,
            cs.class_id, c.code AS class_code, c.name AS class_name,
            cs.subject_id, s.code AS subject_code, s.name AS subject_name,
            cs.academic_year_id, ay.code AS ay_code, ay.name AS ay_name
     FROM teaching_assignments ta
     INNER JOIN teachers t ON t.id = ta.teacher_id
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     ${where}
     ORDER BY c.name ASC, s.name ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    class_subject_id: row.class_subject_id,
    teacher: { id: row.teacher_id, name: row.teacher_name, nip: row.teacher_nip || null },
    class: { id: row.class_id, code: row.class_code, name: row.class_name },
    subject: { id: row.subject_id, code: row.subject_code, name: row.subject_name },
    academic_year: { id: row.academic_year_id, code: row.ay_code, name: row.ay_name },
    assigned_at: row.assigned_at,
    ended_at: row.ended_at,
    is_active: row.ended_at === null,
  }));
};

const addScheduleSlot = async ({ teachingAssignmentId, dayOfWeek, startTime, endTime, room = null, notes = null }) => {
  validateTimeRange(startTime, endTime);

  return db.transaction(async (connection) => {
    const assignment = await ensureTeachingAssignmentActive(connection, teachingAssignmentId);

    await checkScheduleConflicts(connection, {
      assignmentId: teachingAssignmentId,
      teacherId: assignment.teacher_id,
      classId: assignment.class_id,
      academicYearId: assignment.academic_year_id,
      dayOfWeek,
      startTime,
      endTime,
      room,
    });

    const [insertResult] = await connection.execute(
      `INSERT INTO schedule_slots (teaching_assignment_id, day_of_week, start_time, end_time, room, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teachingAssignmentId, dayOfWeek, startTime, endTime, room || null, notes || null]
    );

    const [rows] = await connection.execute(
      `SELECT ss.id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
              ta.id AS assignment_id,
              t.id AS teacher_id, t.name AS teacher_name,
              c.id AS class_id, c.code AS class_code, c.name AS class_name,
              s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
              ay.id AS academic_year_id, ay.code AS ay_code, ay.name AS ay_name
       FROM schedule_slots ss
       INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id
       INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
       INNER JOIN teachers t ON t.id = ta.teacher_id
       INNER JOIN classes c ON c.id = cs.class_id
       INNER JOIN subjects s ON s.id = cs.subject_id
       INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
       WHERE ss.id = ?`,
      [insertResult.insertId]
    );

    return rows[0];
  });
};

const updateScheduleSlot = async (slotId, payload) => {
  await ensureSlotExists(slotId);

  return db.transaction(async (connection) => {
    const [slotRows] = await connection.execute(
      `SELECT ss.id, ss.teaching_assignment_id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
              ta.teacher_id, cs.class_id, cs.academic_year_id
       FROM schedule_slots ss
       INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
       INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
       WHERE ss.id = ?`,
      [slotId]
    );

    if (!slotRows.length) {
      throw ApiError.badRequest('Cannot update slot of inactive assignment');
    }

    const current = slotRows[0];

    const dayOfWeek = payload.dayOfWeek ?? current.day_of_week;
    const startTime = payload.startTime ?? current.start_time;
    const endTime = payload.endTime ?? current.end_time;
    const room = payload.room !== undefined ? payload.room : current.room;
    const notes = payload.notes !== undefined ? payload.notes : current.notes;

    validateTimeRange(startTime, endTime);

    await checkScheduleConflicts(connection, {
      assignmentId: current.teaching_assignment_id,
      teacherId: current.teacher_id,
      classId: current.class_id,
      academicYearId: current.academic_year_id,
      dayOfWeek,
      startTime,
      endTime,
      room,
      excludeSlotId: slotId,
    });

    await connection.execute(
      `UPDATE schedule_slots
       SET day_of_week = ?, start_time = ?, end_time = ?, room = ?, notes = ?
       WHERE id = ?`,
      [dayOfWeek, startTime, endTime, room || null, notes || null, slotId]
    );

    const [rows] = await connection.execute(
      `SELECT ss.id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
              ta.id AS assignment_id,
              t.id AS teacher_id, t.name AS teacher_name,
              c.id AS class_id, c.code AS class_code, c.name AS class_name,
              s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
              ay.id AS academic_year_id, ay.code AS ay_code, ay.name AS ay_name
       FROM schedule_slots ss
       INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id
       INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
       INNER JOIN teachers t ON t.id = ta.teacher_id
       INNER JOIN classes c ON c.id = cs.class_id
       INNER JOIN subjects s ON s.id = cs.subject_id
       INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
       WHERE ss.id = ?`,
      [slotId]
    );

    return rows[0];
  });
};

const deleteScheduleSlot = async (slotId) => {
  await ensureSlotExists(slotId);
  await db.query('DELETE FROM schedule_slots WHERE id = ?', [slotId]);
};

const getClassSchedule = async ({ classId, academicYearId }) => {
  const rows = await db.query(
    `SELECT ss.id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
            c.id AS class_id, c.code AS class_code, c.name AS class_name,
            ay.id AS academic_year_id, ay.code AS ay_code, ay.name AS ay_name,
            s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
            t.id AS teacher_id, t.name AS teacher_name, t.nip AS teacher_nip
     FROM schedule_slots ss
     INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     WHERE cs.class_id = ? AND cs.academic_year_id = ?
     ORDER BY ss.day_of_week ASC, ss.start_time ASC`,
    [classId, academicYearId]
  );

  if (!rows.length) {
    return {
      class: null,
      academic_year: null,
      slots: [],
    };
  }

  return {
    class: {
      id: rows[0].class_id,
      code: rows[0].class_code,
      name: rows[0].class_name,
    },
    academic_year: {
      id: rows[0].academic_year_id,
      code: rows[0].ay_code,
      name: rows[0].ay_name,
    },
    slots: rows.map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      room: row.room || null,
      notes: row.notes || null,
      subject: {
        id: row.subject_id,
        code: row.subject_code,
        name: row.subject_name,
      },
      teacher: {
        id: row.teacher_id,
        name: row.teacher_name,
        nip: row.teacher_nip || null,
      },
    })),
  };
};

const getTeacherSchedule = async ({ teacherId, academicYearId }) => {
  const rows = await db.query(
    `SELECT ss.id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
            t.id AS teacher_id, t.name AS teacher_name, t.nip AS teacher_nip,
            ay.id AS academic_year_id, ay.code AS ay_code, ay.name AS ay_name,
            c.id AS class_id, c.code AS class_code, c.name AS class_name,
            s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
     FROM schedule_slots ss
     INNER JOIN teaching_assignments ta ON ta.id = ss.teaching_assignment_id AND ta.ended_at IS NULL
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id AND cs.ended_at IS NULL
     INNER JOIN teachers t ON t.id = ta.teacher_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     WHERE ta.teacher_id = ? AND cs.academic_year_id = ?
     ORDER BY ss.day_of_week ASC, ss.start_time ASC`,
    [teacherId, academicYearId]
  );

  if (!rows.length) {
    return {
      teacher: null,
      academic_year: null,
      slots: [],
    };
  }

  return {
    teacher: {
      id: rows[0].teacher_id,
      name: rows[0].teacher_name,
      nip: rows[0].teacher_nip || null,
    },
    academic_year: {
      id: rows[0].academic_year_id,
      code: rows[0].ay_code,
      name: rows[0].ay_name,
    },
    slots: rows.map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      room: row.room || null,
      notes: row.notes || null,
      class: {
        id: row.class_id,
        code: row.class_code,
        name: row.class_name,
      },
      subject: {
        id: row.subject_id,
        code: row.subject_code,
        name: row.subject_name,
      },
    })),
  };
};

const getStudentSchedule = async ({ studentId, academicYearId, requester }) => {
  const student = await ensureStudentExists(studentId);
  assertStudentScheduleAccess(student, requester);
  const academicYear = await ensureAcademicYearExistsByDb(academicYearId);

  const rows = await db.query(
    `SELECT ss.id, ss.day_of_week, ss.start_time, ss.end_time, ss.room, ss.notes,
            c.id AS class_id, c.code AS class_code, c.name AS class_name,
            s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
            t.id AS teacher_id, t.name AS teacher_name, t.nip AS teacher_nip
     FROM student_enrollments se
     INNER JOIN class_subjects cs
       ON cs.class_id = se.class_id
      AND cs.academic_year_id = se.academic_year_id
      AND cs.ended_at IS NULL
     INNER JOIN teaching_assignments ta
       ON ta.class_subject_id = cs.id
      AND ta.ended_at IS NULL
     INNER JOIN schedule_slots ss
       ON ss.teaching_assignment_id = ta.id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     WHERE se.student_id = ?
       AND se.academic_year_id = ?
       AND se.ended_date IS NULL
     ORDER BY ss.day_of_week ASC, ss.start_time ASC`,
    [studentId, academicYearId]
  );

  return {
    student: {
      id: student.id,
      nis: student.nis,
      name: student.name,
    },
    academic_year: {
      id: academicYear.id,
      code: academicYear.code,
      name: academicYear.name,
    },
    slots: rows.map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      room: row.room || null,
      notes: row.notes || null,
      class: {
        id: row.class_id,
        code: row.class_code,
        name: row.class_name,
      },
      subject: {
        id: row.subject_id,
        code: row.subject_code,
        name: row.subject_name,
      },
      teacher: {
        id: row.teacher_id,
        name: row.teacher_name,
        nip: row.teacher_nip || null,
      },
    })),
  };
};

module.exports = {
  addClassSubject,
  revokeClassSubject,
  getClassSubjects,
  assignTeacher,
  revokeTeacherAssignment,
  deleteTeachingAssignmentPermanent,
  getTeachingAssignments,
  addScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
  getClassSchedule,
  getTeacherSchedule,
  getStudentSchedule,
};
