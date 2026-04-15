const { body, param, query } = require('express-validator');

const getSubjectsValidation = [
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

const subjectIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const createSubjectValidation = [
  body('code')
    .notEmpty()
    .withMessage('code is required')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9_\-]+$/)
    .withMessage('code may only contain letters, digits, hyphens, and underscores'),
  body('name')
    .notEmpty()
    .withMessage('name is required')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('name must be between 2 and 255 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description maximum length is 1000 characters'),
];

const updateSubjectValidation = [
  ...subjectIdParamValidation,
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9_\-]+$/)
    .withMessage('code may only contain letters, digits, hyphens, and underscores'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('name must be between 2 and 255 characters'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description maximum length is 1000 characters'),
];

module.exports = {
  getSubjectsValidation,
  subjectIdParamValidation,
  createSubjectValidation,
  updateSubjectValidation,
};
