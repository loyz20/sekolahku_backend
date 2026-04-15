const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const getUserDuties = (user) => {
  if (Array.isArray(user.duties)) {
    return user.duties;
  }

  // Backward compatibility for old token payload with a single role field.
  if (typeof user.role === 'string' && user.role.length > 0) {
    return [user.role];
  }

  return [];
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired');
    }
    throw ApiError.unauthorized('Invalid token');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const userDuties = getUserDuties(req.user);

    // Superadmin bypasses all role checks.
    if (userDuties.includes('superadmin')) {
      return next();
    }

    const isAuthorized = roles.some((role) => userDuties.includes(role));

    if (!isAuthorized) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }

    next();
  };
};

module.exports = { authenticate, authorize };
