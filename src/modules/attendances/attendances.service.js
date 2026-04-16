const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const ATTENDANCE_STATUSES = ['HADIR', 'SAKIT', 'IZIN', 'ALPA'];

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

const getTeachingAssignmentContext = async (assignmentId) => {
  const rows = await db.query(
    `SELECT
      ta.id,
      ta.teacher_id,
      ta.ended_at,
      cs.id AS class_subject_id,
      cs.class_id,
      cs.subject_id,
      cs.academic_year_id,
      cs.ended_at AS class_subject_ended_at,
      c.code AS class_code,
      c.name AS class_name,
      s.code AS subject_code,
      s.name AS subject_name,
      t.name AS teacher_name,
      t.nip AS teacher_nip,
      ay.code AS ay_code,
      ay.name AS ay_name
     FROM teaching_assignments ta
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     INNER JOIN academic_years ay ON ay.id = cs.academic_year_id
     WHERE ta.id = ?`,
    [assignmentId]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Teaching assignment with id ${assignmentId} not found`);
  }

  const row = rows[0];
  if (row.ended_at || row.class_subject_ended_at) {
    throw ApiError.badRequest('Teaching assignment is not active');
  }

  return {
    id: row.id,
    teacher_id: row.teacher_id,
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
    academic_year: {
      id: row.academic_year_id,
      code: row.ay_code,
      name: row.ay_name,
    },
  };
};

const assertCanAccessTeacherData = async (teacherId, actor) => {
  if (!isGuruOnly(actor)) return;
  const actorTeacherId = await resolveTeacherIdByUserId(actor.id);
  if (teacherId !== actorTeacherId) {
    throw ApiError.forbidden('You can only access attendance for your own teaching assignments');
  }
};

const getMeetingById = async (id, actor) => {
  const rows = await db.query(
    `SELECT
      sm.id,
      sm.teaching_assignment_id,
      sm.academic_year_id,
      sm.meeting_no,
      sm.meeting_date,
      sm.topic,
      sm.notes,
      sm.created_at,
      sm.updated_at,
      ta.teacher_id,
      c.id AS class_id,
      c.code AS class_code,
      c.name AS class_name,
      s.id AS subject_id,
      s.code AS subject_code,
      s.name AS subject_name,
      t.name AS teacher_name,
      t.nip AS teacher_nip,
      ay.code AS ay_code,
      ay.name AS ay_name
     FROM subject_meetings sm
     INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     INNER JOIN classes c ON c.id = cs.class_id
     INNER JOIN subjects s ON s.id = cs.subject_id
     INNER JOIN teachers t ON t.id = ta.teacher_id
     INNER JOIN academic_years ay ON ay.id = sm.academic_year_id
     WHERE sm.id = ?`,
    [id]
  );

  if (!rows.length) {
    throw ApiError.notFound(`Meeting with id ${id} not found`);
  }

  const row = rows[0];
  await assertCanAccessTeacherData(row.teacher_id, actor);

  const attendanceRows = await db.query(
    `SELECT
      ar.id,
      ar.student_id,
      ar.status,
      ar.notes,
      ar.marked_at,
      ar.updated_at,
      st.nis AS student_nis,
      st.name AS student_name
     FROM attendance_records ar
     INNER JOIN students st ON st.id = ar.student_id
     WHERE ar.subject_meeting_id = ?
     ORDER BY st.name ASC`,
    [id]
  );

  return {
    id: row.id,
    meeting_no: row.meeting_no,
    meeting_date: row.meeting_date,
    topic: row.topic || null,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    teaching_assignment: {
      id: row.teaching_assignment_id,
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
      academic_year: {
        id: row.academic_year_id,
        code: row.ay_code,
        name: row.ay_name,
      },
    },
    attendance: attendanceRows.map((a) => ({
      id: a.id,
      student: {
        id: a.student_id,
        nis: a.student_nis,
        name: a.student_name,
      },
      status: a.status,
      notes: a.notes || null,
      marked_at: a.marked_at,
      updated_at: a.updated_at,
    })),
  };
};

const getMeetings = async ({ page = 1, limit = 10, classId = '', subjectId = '', teacherId = '', academicYearId = '', meetingDate = '', actor } = {}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  const countParams = [];

  let effectiveTeacherId = teacherId;
  if (isGuruOnly(actor)) {
    effectiveTeacherId = await resolveTeacherIdByUserId(actor.id);
  }

  if (classId) {
    conditions.push('cs.class_id = ?');
    params.push(Number(classId));
    countParams.push(Number(classId));
  }

  if (subjectId) {
    conditions.push('cs.subject_id = ?');
    params.push(Number(subjectId));
    countParams.push(Number(subjectId));
  }

  if (effectiveTeacherId) {
    conditions.push('ta.teacher_id = ?');
    params.push(Number(effectiveTeacherId));
    countParams.push(Number(effectiveTeacherId));
  }

  if (academicYearId) {
    conditions.push('sm.academic_year_id = ?');
    params.push(Number(academicYearId));
    countParams.push(Number(academicYearId));
  }

  if (meetingDate) {
    conditions.push('sm.meeting_date = ?');
    params.push(meetingDate);
    countParams.push(meetingDate);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) AS total
    FROM subject_meetings sm
    INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
    INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
    ${where}
  `;

  const dataSql = `
    SELECT
      sm.id,
      sm.teaching_assignment_id,
      sm.meeting_no,
      sm.meeting_date,
      sm.topic,
      sm.created_at,
      c.id AS class_id,
      c.code AS class_code,
      c.name AS class_name,
      s.id AS subject_id,
      s.code AS subject_code,
      s.name AS subject_name,
      t.id AS teacher_id,
      t.name AS teacher_name,
      t.nip AS teacher_nip,
      ay.id AS ay_id,
      ay.code AS ay_code,
      ay.name AS ay_name,
      (SELECT COUNT(*) FROM attendance_records ar WHERE ar.subject_meeting_id = sm.id) AS attendance_count
    FROM subject_meetings sm
    INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
    INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
    INNER JOIN classes c ON c.id = cs.class_id
    INNER JOIN subjects s ON s.id = cs.subject_id
    INNER JOIN teachers t ON t.id = ta.teacher_id
    INNER JOIN academic_years ay ON ay.id = sm.academic_year_id
    ${where}
    ORDER BY sm.meeting_date DESC, sm.meeting_no DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;

  const [countRow] = await db.query(countSql, countParams);
  const rows = await db.query(dataSql, params);

  return {
    meetings: rows.map((r) => ({
      id: r.id,
      meeting_no: r.meeting_no,
      meeting_date: r.meeting_date,
      topic: r.topic || null,
      created_at: r.created_at,
      attendance_count: Number(r.attendance_count || 0),
      teaching_assignment: {
        id: r.teaching_assignment_id,
        class: { id: r.class_id, code: r.class_code, name: r.class_name },
        subject: { id: r.subject_id, code: r.subject_code, name: r.subject_name },
        teacher: { id: r.teacher_id, name: r.teacher_name, nip: r.teacher_nip || null },
        academic_year: { id: r.ay_id, code: r.ay_code, name: r.ay_name },
      },
    })),
    meta: {
      total: countRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
};

const createMeeting = async ({ teaching_assignment_id, meeting_no, meeting_date, topic, notes }, actor) => {
  const assignment = await getTeachingAssignmentContext(teaching_assignment_id);
  await assertCanAccessTeacherData(assignment.teacher_id, actor);

  let meetingNo = meeting_no;
  if (meetingNo === undefined || meetingNo === null || Number.isNaN(Number(meetingNo))) {
    const [lastMeeting] = await db.query(
      'SELECT meeting_no FROM subject_meetings WHERE teaching_assignment_id = ? ORDER BY meeting_no DESC LIMIT 1',
      [teaching_assignment_id]
    );
    meetingNo = lastMeeting ? Number(lastMeeting.meeting_no) + 1 : 1;
  }

  try {
    const result = await db.query(
      `INSERT INTO subject_meetings (teaching_assignment_id, academic_year_id, meeting_no, meeting_date, topic, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        teaching_assignment_id,
        assignment.academic_year.id,
        Number(meetingNo),
        meeting_date,
        topic || null,
        notes || null,
        actor.id || null,
      ]
    );

    return getMeetingById(result.insertId, actor);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('Meeting number or meeting date already exists for this teaching assignment');
    }
    throw error;
  }
};

const updateMeeting = async (id, { meeting_no, meeting_date, topic, notes }, actor) => {
  const [existing] = await db.query(
    `SELECT sm.id, sm.teaching_assignment_id, ta.teacher_id
     FROM subject_meetings sm
     INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
     WHERE sm.id = ?`,
    [id]
  );

  if (!existing) {
    throw ApiError.notFound(`Meeting with id ${id} not found`);
  }

  await assertCanAccessTeacherData(existing.teacher_id, actor);

  const sets = [];
  const params = [];

  if (meeting_no !== undefined) {
    sets.push('meeting_no = ?');
    params.push(Number(meeting_no));
  }
  if (meeting_date !== undefined) {
    sets.push('meeting_date = ?');
    params.push(meeting_date);
  }
  if (topic !== undefined) {
    sets.push('topic = ?');
    params.push(topic || null);
  }
  if (notes !== undefined) {
    sets.push('notes = ?');
    params.push(notes || null);
  }

  if (!sets.length) {
    throw ApiError.badRequest('No fields provided to update');
  }

  params.push(id);

  try {
    await db.query(`UPDATE subject_meetings SET ${sets.join(', ')} WHERE id = ?`, params);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('Meeting number or meeting date already exists for this teaching assignment');
    }
    throw error;
  }

  return getMeetingById(id, actor);
};

const upsertMeetingAttendance = async (meetingId, records, actor) => {
  if (!records || !records.length) {
    throw ApiError.badRequest('records is required');
  }

  const [meeting] = await db.query(
    `SELECT
      sm.id,
      sm.academic_year_id,
      ta.teacher_id,
      cs.class_id
     FROM subject_meetings sm
     INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
     INNER JOIN class_subjects cs ON cs.id = ta.class_subject_id
     WHERE sm.id = ?`,
    [meetingId]
  );

  if (!meeting) {
    throw ApiError.notFound(`Meeting with id ${meetingId} not found`);
  }

  await assertCanAccessTeacherData(meeting.teacher_id, actor);

  const normalized = records.map((r) => ({
    student_id: Number(r.student_id),
    status: String(r.status || '').toUpperCase(),
    notes: r.notes || null,
  }));

  const invalidStatus = normalized.find((r) => !ATTENDANCE_STATUSES.includes(r.status));
  if (invalidStatus) {
    throw ApiError.badRequest(`Invalid status: ${invalidStatus.status}`);
  }

  const uniqueStudentIds = [...new Set(normalized.map((r) => r.student_id))];
  const placeholders = uniqueStudentIds.map(() => '?').join(',');

  const enrolledRows = await db.query(
    `SELECT se.student_id
     FROM student_enrollments se
     INNER JOIN students st ON st.id = se.student_id
     WHERE se.class_id = ?
       AND se.academic_year_id = ?
       AND se.ended_date IS NULL
       AND st.is_active = 1
       AND se.student_id IN (${placeholders})`,
    [meeting.class_id, meeting.academic_year_id, ...uniqueStudentIds]
  );

  const enrolledSet = new Set(enrolledRows.map((r) => r.student_id));
  const notEnrolledIds = uniqueStudentIds.filter((id) => !enrolledSet.has(id));
  if (notEnrolledIds.length) {
    throw ApiError.badRequest(`Some students are not active in this class/year: ${notEnrolledIds.join(', ')}`);
  }

  await db.transaction(async (connection) => {
    for (const item of normalized) {
      await connection.execute(
        `INSERT INTO attendance_records (subject_meeting_id, student_id, status, notes)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP`,
        [meetingId, item.student_id, item.status, item.notes]
      );
    }
  });

  return getMeetingById(meetingId, actor);
};

const deleteMeeting = async (id, actor) => {
  const [meeting] = await db.query(
    `SELECT sm.id, ta.teacher_id
     FROM subject_meetings sm
     INNER JOIN teaching_assignments ta ON ta.id = sm.teaching_assignment_id
     WHERE sm.id = ?`,
    [id]
  );

  if (!meeting) {
    throw ApiError.notFound(`Meeting with id ${id} not found`);
  }

  await assertCanAccessTeacherData(meeting.teacher_id, actor);
  await db.query('DELETE FROM subject_meetings WHERE id = ?', [id]);
};

module.exports = {
  ATTENDANCE_STATUSES,
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  upsertMeetingAttendance,
  deleteMeeting,
};
