const { body, param, query } = require('express-validator');

const getUsersValidation = [
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
  query('duty')
    .optional()
    .trim()
    .matches(/^[a-z_]*$/)
    .withMessage('duty must contain lowercase letters and underscore only'),
];

const userIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const updateUserValidation = [
  ...userIdParamValidation,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('nip')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]+$/)
    .withMessage('NIP must contain digits only')
    .isLength({ min: 5, max: 30 })
    .withMessage('NIP length must be between 5 and 30 digits'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

const updateMeValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be between 2 and 100 characters'),
  body('nip')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]+$/)
    .withMessage('NIP must contain digits only')
    .isLength({ min: 5, max: 30 })
    .withMessage('NIP length must be between 5 and 30 digits'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

const changePasswordValidation = [
  ...userIdParamValidation,
  body('newPassword')
    .notEmpty()
    .withMessage('newPassword is required')
    .isLength({ min: 8 })
    .withMessage('newPassword must be at least 8 characters'),
];

const changeMyPasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('currentPassword is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('newPassword is required')
    .isLength({ min: 8 })
    .withMessage('newPassword must be at least 8 characters'),
];

module.exports = {
  getUsersValidation,
  userIdParamValidation,
  updateUserValidation,
  updateMeValidation,
  changePasswordValidation,
  changeMyPasswordValidation,
};
