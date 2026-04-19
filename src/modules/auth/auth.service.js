const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const db = require('../../config/database');
const ApiError = require('../../utils/ApiError');

const getUserDuties = async (userId) => {
  const duties = await db.query(
    `SELECT d.code
     FROM user_duties ud
     INNER JOIN duties d ON d.id = ud.duty_id
     WHERE ud.user_id = ? AND ud.ended_at IS NULL
     ORDER BY d.code ASC`,
    [userId]
  );

  return duties.map((duty) => duty.code);
};

const resolvePrimaryRole = (duties) => {
  if (!duties.length) {
    return 'guru';
  }

  if (duties.includes('superadmin')) {
    return 'superadmin';
  }

  if (duties.includes('admin')) {
    return 'admin';
  }

  return duties[0];
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      duties: user.duties,
      primaryRole: user.primaryRole,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const register = async ({ name, nip = null, email, password }) => {
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  if (nip) {
    const [nipExists] = await db.query('SELECT id FROM users WHERE nip = ?', [nip]);
    if (nipExists) {
      throw ApiError.conflict('NIP already registered');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const userId = await db.transaction(async (connection) => {
    const [createUserResult] = await connection.execute(
      'INSERT INTO users (name, nip, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, nip || null, email, hashedPassword, 'guru']
    );

    const [dutyRows] = await connection.execute('SELECT id FROM duties WHERE code = ?', ['guru']);

    if (!dutyRows.length) {
      throw ApiError.internal('Default duty "guru" is not configured');
    }

    await connection.execute(
      'INSERT INTO user_duties (user_id, duty_id) VALUES (?, ?)',
      [createUserResult.insertId, dutyRows[0].id]
    );

    return createUserResult.insertId;
  });

  const duties = await getUserDuties(userId);
  const primaryRole = resolvePrimaryRole(duties);

  return {
    id: userId,
    name,
    nip: nip || null,
    email,
    duties,
    primaryRole,
  };
};

const login = async ({ email, password }) => {
  // Support login with both email and NIP
  let users = [];
  
  if (email && email.includes('@')) {
    // Email login
    users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  } else if (email) {
    // NIP login
    users = await db.query('SELECT * FROM users WHERE nip = ?', [email]);
  }

  if (!users.length) {
    throw ApiError.unauthorized('Invalid email/NIP or password');
  }

  const user = users[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email/NIP or password');
  }

  const duties = await getUserDuties(user.id);
  const primaryRole = resolvePrimaryRole(duties);

  const token = generateToken({
    id: user.id,
    email: user.email,
    duties,
    primaryRole,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      nip: user.nip || null,
      email: user.email,
      duties,
      primaryRole,
    },
    token,
  };
};

module.exports = { register, login };
