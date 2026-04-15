const { body, param, query } = require('express-validator');

const getdutiesValidation = [
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
];

const assignDutyValidation = [
  body('userId')
    .notEmpty()
    .withMessage('userId is required')
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
    .toInt(),
  body('dutyCode')
    .trim()
    .notEmpty()
    .withMessage('dutyCode is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('dutyCode length must be between 2 and 50 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('dutyCode must contain lowercase letters and underscore only'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('notes maximum length is 255 characters'),
];

const revokeDutyValidation = [...assignDutyValidation];

const assignHomeroomValidation = [
  body('userId')
    .notEmpty()
    .withMessage('userId is required')
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
    .toInt(),
  body('classId')
    .notEmpty()
    .withMessage('classId is required')
    .isInt({ min: 1 })
    .withMessage('classId must be a positive integer')
    .toInt(),
  body('academicYearId')
    .notEmpty()
    .withMessage('academicYearId is required')
    .isInt({ min: 1 })
    .withMessage('academicYearId must be a positive integer')
    .toInt(),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('notes maximum length is 255 characters'),
];

const revokeHomeroomValidation = [
  body('classId')
    .notEmpty()
    .withMessage('classId is required')
    .isInt({ min: 1 })
    .withMessage('classId must be a positive integer')
    .toInt(),
  body('academicYearId')
    .notEmpty()
    .withMessage('academicYearId is required')
    .isInt({ min: 1 })
    .withMessage('academicYearId must be a positive integer')
    .toInt(),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('notes maximum length is 255 characters'),
];

const userIdParamValidation = [
  param('userId')
    .notEmpty()
    .withMessage('userId is required')
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
    .toInt(),
];

module.exports = {
  getdutiesValidation,
  assignDutyValidation,
  revokeDutyValidation,
  assignHomeroomValidation,
  revokeHomeroomValidation,
  userIdParamValidation,
};
