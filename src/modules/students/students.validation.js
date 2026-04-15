const { body, param, query } = require('express-validator');

const getStudentsValidation = [
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
  query('class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('class_id must be a positive integer')
    .toInt(),
  query('academic_year_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be a positive integer')
    .toInt(),
];

const studentIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const createStudentValidation = [
  body('nis')
    .notEmpty()
    .withMessage('nis is required')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('nis must be between 1 and 30 characters'),
  body('name')
    .notEmpty()
    .withMessage('name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('place_of_birth')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('place_of_birth maximum length is 100 characters'),
  body('date_of_birth')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('date_of_birth must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(['M', 'F'])
    .withMessage('gender must be M or F'),
  body('address')
    .optional({ values: 'falsy' })
    .trim(),
  body('parent_phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('parent_phone maximum length is 20 characters'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('user_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('user_id must be a positive integer')
    .toInt(),
];

const updateStudentValidation = [
  ...studentIdParamValidation,
  body('nis')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('nis must be between 1 and 30 characters'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('place_of_birth')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('place_of_birth maximum length is 100 characters'),
  body('date_of_birth')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('date_of_birth must be a valid date (YYYY-MM-DD)')
    .toDate(),
  body('gender')
    .optional({ values: 'falsy' })
    .isIn(['M', 'F'])
    .withMessage('gender must be M or F'),
  body('address')
    .optional({ values: 'falsy' })
    .trim(),
  body('parent_phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('parent_phone maximum length is 20 characters'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

const enrollStudentValidation = [
  ...studentIdParamValidation,
  body('class_id')
    .notEmpty()
    .withMessage('class_id is required')
    .isInt({ min: 1 })
    .withMessage('class_id must be a positive integer')
    .toInt(),
  body('academic_year_id')
    .notEmpty()
    .withMessage('academic_year_id is required')
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be a positive integer')
    .toInt(),
];

const enrollmentIdParamValidation = [
  param('enrollmentId')
    .notEmpty()
    .withMessage('enrollmentId is required')
    .isInt({ min: 1 })
    .withMessage('enrollmentId must be a positive integer')
    .toInt(),
];

module.exports = {
  getStudentsValidation,
  studentIdParamValidation,
  createStudentValidation,
  updateStudentValidation,
  enrollStudentValidation,
  enrollmentIdParamValidation,
};
