const { body, param, query, validationResult } = require('express-validator');

const createTeacherValidation = [
  body('nip')
    .trim()
    .notEmpty()
    .withMessage('NIP is required')
    .isLength({ min: 1, max: 30 })
    .withMessage('NIP must be between 1 and 30 characters'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('place_of_birth')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Place of birth must not exceed 100 characters'),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be in ISO8601 format (YYYY-MM-DD)'),

  body('gender')
    .optional()
    .isIn(['M', 'F'])
    .withMessage('Gender must be M or F'),

  body('address')
    .optional()
    .trim(),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be valid'),

  body('specialization')
    .optional()
    .trim(),

  body('qualification')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Qualification must not exceed 100 characters'),

  body('user_id')
    .optional()
    .custom((value) => value === null || (Number.isInteger(value) && value > 0) || (/^\d+$/.test(String(value)) && Number(value) > 0))
    .withMessage('User ID must be null or a positive integer'),
];

const updateTeacherValidation = [
  body('nip')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('NIP must be between 1 and 30 characters'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('place_of_birth')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Place of birth must not exceed 100 characters'),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be in ISO8601 format (YYYY-MM-DD)'),

  body('gender')
    .optional()
    .isIn(['M', 'F'])
    .withMessage('Gender must be M or F'),

  body('address')
    .optional()
    .trim(),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be valid'),

  body('specialization')
    .optional()
    .trim(),

  body('qualification')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Qualification must not exceed 100 characters'),

  body('user_id')
    .optional()
    .custom((value) => value === null || (Number.isInteger(value) && value > 0) || (/^\d+$/.test(String(value)) && Number(value) > 0))
    .withMessage('User ID must be null or a positive integer'),
];

const getTeachersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search must not exceed 100 characters'),

  query('specialization')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Specialization filter must not exceed 100 characters'),
];

const teacherIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Teacher ID must be a positive integer')
    .toInt(),
];

module.exports = {
  createTeacherValidation,
  updateTeacherValidation,
  getTeachersValidation,
  teacherIdValidation,
};
