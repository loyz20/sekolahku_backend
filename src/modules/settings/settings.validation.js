const { body, query } = require('express-validator');

const getSettingsValidation = [
  query('group')
    .optional()
    .trim()
    .matches(/^[a-z_]+$/)
    .withMessage('group must contain lowercase letters and underscores only'),
];

const updateSettingsValidation = [
  body('settings')
    .isArray({ min: 1 })
    .withMessage('settings must be a non-empty array'),
  body('settings.*.key')
    .notEmpty()
    .withMessage('each setting must have a key')
    .isString()
    .withMessage('key must be a string')
    .matches(/^[a-z_]+$/)
    .withMessage('key must contain lowercase letters and underscores only'),
  body('settings.*.value')
    .exists()
    .withMessage('each setting must have a value (use null to clear)'),
];

module.exports = { getSettingsValidation, updateSettingsValidation };
