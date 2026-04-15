const { body, param, query } = require('express-validator');

const getAcademicYearsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search maximum length is 100 characters'),
];

const academicYearIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const createAcademicYearValidation = [
  body('code')
    .notEmpty()
    .withMessage('code is required')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9_\-\/]+$/)
    .withMessage('code may only contain letters, digits, hyphens, underscores, and slashes'),
  body('name')
    .notEmpty()
    .withMessage('name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('start_date')
    .notEmpty()
    .withMessage('start_date is required')
    .isISO8601()
    .withMessage('start_date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('end_date')
    .notEmpty()
    .withMessage('end_date is required')
    .isISO8601()
    .withMessage('end_date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('semester')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('semester must be 1 or 2')
    .toInt(),
];

const updateAcademicYearValidation = [
  ...academicYearIdParamValidation,
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9_\-\/]+$/)
    .withMessage('code may only contain letters, digits, hyphens, underscores, and slashes'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('semester')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('semester must be 1 or 2')
    .toInt(),
];

module.exports = {
  getAcademicYearsValidation,
  academicYearIdParamValidation,
  createAcademicYearValidation,
  updateAcademicYearValidation,
};
