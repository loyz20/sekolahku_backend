const { body, param, query } = require('express-validator');

const getClassesValidation = [
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
  query('level')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('level maximum length is 20 characters'),
  query('assigned_only')
    .optional()
    .isBoolean()
    .withMessage('assigned_only must be boolean')
    .toBoolean(),
];

const classIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const createClassValidation = [
  body('code')
    .notEmpty()
    .withMessage('code is required')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('code must be between 1 and 30 characters')
    .matches(/^[A-Za-z0-9_.\-]+$/)
    .withMessage('code may only contain letters, digits, dots, hyphens, and underscores'),
  body('name')
    .notEmpty()
    .withMessage('name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('level')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('level maximum length is 20 characters'),
];

const updateClassValidation = [
  ...classIdParamValidation,
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('code must be between 1 and 30 characters')
    .matches(/^[A-Za-z0-9_.\-]+$/)
    .withMessage('code may only contain letters, digits, dots, hyphens, and underscores'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('level')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('level maximum length is 20 characters'),
];

module.exports = {
  getClassesValidation,
  classIdParamValidation,
  createClassValidation,
  updateClassValidation,
};
