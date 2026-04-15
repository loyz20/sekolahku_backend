require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEMO = {
  user: {
    name: process.env.SEED_TEACHER_NAME || 'Guru Demo',
    email: process.env.SEED_TEACHER_EMAIL || 'guru.demo@sekolahku.id',
    nip: process.env.SEED_TEACHER_NIP || '198504132010011001',
    password: process.env.SEED_TEACHER_PASSWORD || 'Password123',
  },
  teacher: {
    placeOfBirth: process.env.SEED_TEACHER_BIRTH_PLACE || 'Bandung',
    dateOfBirth: process.env.SEED_TEACHER_BIRTH_DATE || '1985-04-13',
    gender: process.env.SEED_TEACHER_GENDER || 'F',
    address: process.env.SEED_TEACHER_ADDRESS || 'Jl. Pendidikan No. 10',
    phone: process.env.SEED_TEACHER_PHONE || '081234567890',
    specialization: process.env.SEED_TEACHER_SPECIALIZATION || 'Matematika',
    qualification: process.env.SEED_TEACHER_QUALIFICATION || 'S1',
  },
  academicYear: {
    code: process.env.SEED_AY_CODE || '2026/2027',
    name: process.env.SEED_AY_NAME || 'Tahun Ajaran 2026/2027',
    startDate: process.env.SEED_AY_START_DATE || '2026-07-01',
    endDate: process.env.SEED_AY_END_DATE || '2027-06-30',
    semester: Number(process.env.SEED_AY_SEMESTER || 1),
  },
  class: {
    code: process.env.SEED_CLASS_CODE || 'X-DEMO-1',
    name: process.env.SEED_CLASS_NAME || 'X Demo 1',
    level: process.env.SEED_CLASS_LEVEL || 'X',
  },
};

async function ensureDuty(connection, code) {
  const [rows] = await connection.execute('SELECT id FROM duties WHERE code = ? LIMIT 1', [code]);
  if (!rows.length) {
    throw new Error(`Duty "${code}" not found. Run migrations first.`);
  }
  return rows[0].id;
}

async function ensureUser(connection) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [DEMO.user.email]);
  const hashedPassword = await bcrypt.hash(DEMO.user.password, 12);

  if (rows.length) {
    const id = rows[0].id;
    await connection.execute(
      'UPDATE users SET name = ?, nip = ?, password = ?, role = ?, is_active = 1 WHERE id = ?',
      [DEMO.user.name, DEMO.user.nip, hashedPassword, 'guru', id]
    );
    return id;
  }

  const [result] = await connection.execute(
    'INSERT INTO users (name, nip, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [DEMO.user.name, DEMO.user.nip, DEMO.user.email, hashedPassword, 'guru']
  );

  return result.insertId;
}

async function ensureTeacher(connection, userId) {
  const [rows] = await connection.execute('SELECT id FROM teachers WHERE nip = ? LIMIT 1', [DEMO.user.nip]);

  if (rows.length) {
    const teacherId = rows[0].id;
    await connection.execute(
      `UPDATE teachers
       SET name = ?, place_of_birth = ?, date_of_birth = ?, gender = ?,
           address = ?, phone = ?, email = ?, specialization = ?, qualification = ?,
           user_id = ?, is_active = 1
       WHERE id = ?`,
      [
        DEMO.user.name,
        DEMO.teacher.placeOfBirth,
        DEMO.teacher.dateOfBirth,
        DEMO.teacher.gender,
        DEMO.teacher.address,
        DEMO.teacher.phone,
        DEMO.user.email,
        DEMO.teacher.specialization,
        DEMO.teacher.qualification,
        userId,
        teacherId,
      ]
    );
    return teacherId;
  }

  const [result] = await connection.execute(
    `INSERT INTO teachers (
      nip, name, place_of_birth, date_of_birth, gender, address, phone, email,
      specialization, qualification, user_id, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      DEMO.user.nip,
      DEMO.user.name,
      DEMO.teacher.placeOfBirth,
      DEMO.teacher.dateOfBirth,
      DEMO.teacher.gender,
      DEMO.teacher.address,
      DEMO.teacher.phone,
      DEMO.user.email,
      DEMO.teacher.specialization,
      DEMO.teacher.qualification,
      userId,
    ]
  );

  return result.insertId;
}

async function ensureActiveUserDuty(connection, userId, dutyId, note) {
  const [rows] = await connection.execute(
    'SELECT id FROM user_duties WHERE user_id = ? AND duty_id = ? AND ended_at IS NULL LIMIT 1',
    [userId, dutyId]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO user_duties (user_id, duty_id, notes) VALUES (?, ?, ?)',
    [userId, dutyId, note]
  );

  return result.insertId;
}

async function ensureAcademicYear(connection) {
  const [rows] = await connection.execute('SELECT id FROM academic_years WHERE code = ? LIMIT 1', [DEMO.academicYear.code]);

  if (rows.length) {
    const id = rows[0].id;
    await connection.execute(
      'UPDATE academic_years SET name = ?, start_date = ?, end_date = ?, semester = ? WHERE id = ?',
      [DEMO.academicYear.name, DEMO.academicYear.startDate, DEMO.academicYear.endDate, DEMO.academicYear.semester, id]
    );
    return id;
  }

  const [result] = await connection.execute(
    'INSERT INTO academic_years (code, name, start_date, end_date, is_active, semester) VALUES (?, ?, ?, ?, 0, ?)',
    [DEMO.academicYear.code, DEMO.academicYear.name, DEMO.academicYear.startDate, DEMO.academicYear.endDate, DEMO.academicYear.semester]
  );

  return result.insertId;
}

async function ensureClass(connection) {
  const [rows] = await connection.execute('SELECT id FROM classes WHERE code = ? LIMIT 1', [DEMO.class.code]);

  if (rows.length) {
    const id = rows[0].id;
    await connection.execute('UPDATE classes SET name = ?, level = ? WHERE id = ?', [DEMO.class.name, DEMO.class.level, id]);
    return id;
  }

  const [result] = await connection.execute('INSERT INTO classes (code, name, level) VALUES (?, ?, ?)', [
    DEMO.class.code,
    DEMO.class.name,
    DEMO.class.level,
  ]);

  return result.insertId;
}

async function ensureHomeroomAssignment(connection, userDutyId, classId, academicYearId, note) {
  const [rows] = await connection.execute(
    'SELECT id FROM homeroom_assignments WHERE user_duty_id = ? AND class_id = ? AND academic_year_id = ? AND ended_at IS NULL LIMIT 1',
    [userDutyId, classId, academicYearId]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO homeroom_assignments (user_duty_id, class_id, academic_year_id, notes) VALUES (?, ?, ?, ?)',
    [userDutyId, classId, academicYearId, note]
  );

  return result.insertId;
}

async function seedTeacherDemo() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sekolahku',
  });

  await connection.beginTransaction();

  try {
    const guruDutyId = await ensureDuty(connection, 'guru');
    const waliDutyId = await ensureDuty(connection, 'wali_kelas');

    const userId = await ensureUser(connection);
    const teacherId = await ensureTeacher(connection, userId);

    await ensureActiveUserDuty(connection, userId, guruDutyId, 'Seeded guru duty for teacher demo');
    const waliUserDutyId = await ensureActiveUserDuty(
      connection,
      userId,
      waliDutyId,
      'Seeded wali_kelas duty for teacher demo'
    );

    const academicYearId = await ensureAcademicYear(connection);
    const classId = await ensureClass(connection);

    const homeroomAssignmentId = await ensureHomeroomAssignment(
      connection,
      waliUserDutyId,
      classId,
      academicYearId,
      'Seeded homeroom assignment for teacher demo'
    );

    await connection.commit();

    console.log('[SEED] Teacher demo seed completed successfully.');
    console.log(`[SEED] user_id=${userId}, teacher_id=${teacherId}`);
    console.log(`[SEED] class_id=${classId}, academic_year_id=${academicYearId}, homeroom_assignment_id=${homeroomAssignmentId}`);
    console.log(`[SEED] Login email: ${DEMO.user.email}`);
    console.log(`[SEED] Login password: ${DEMO.user.password}`);
  } catch (error) {
    await connection.rollback();
    console.error('[SEED] Teacher demo seed failed, transaction rolled back:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedTeacherDemo();
