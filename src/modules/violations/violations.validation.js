const { body, param, query } = require('express-validator');

const VIOLATION_SEVERITIES = ['minor', 'moderate', 'severe'];

const violationIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const violationTypeIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const getViolationTypesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search maximum length is 100 characters'),
  query('is_active').optional().isBoolean().withMessage('is_active must be boolean').toBoolean(),
  query('severity').optional().isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
];

const createViolationTypeValidation = [
  body('code').optional().trim().isLength({ max: 50 }).withMessage('code must be at most 50 characters'),
  body('name').notEmpty().withMessage('name is required').trim().isLength({ max: 100 }).withMessage('name must be at most 100 characters'),
  body('severity').notEmpty().withMessage('severity is required').isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
  body('default_points').optional().isInt({ min: 0, max: 1000 }).withMessage('default_points must be between 0 and 1000').toInt(),
  body('description').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean').toBoolean(),
];

const updateViolationTypeValidation = [
  ...violationTypeIdParamValidation,
  body('code').optional().trim().isLength({ max: 50 }).withMessage('code must be at most 50 characters'),
  body('name').optional().trim().isLength({ max: 100 }).withMessage('name must be at most 100 characters'),
  body('severity').optional().isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
  body('default_points').optional().isInt({ min: 0, max: 1000 }).withMessage('default_points must be between 0 and 1000').toInt(),
  body('description').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean').toBoolean(),
];

const getViolationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search maximum length is 100 characters'),
  query('student_id').optional().isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  query('violation_type_id').optional().isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  query('severity').optional().isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid date (YYYY-MM-DD)'),
];

const getViolationStudentsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search maximum length is 100 characters'),
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  query('violation_type_id').optional().isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  query('severity').optional().isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid date (YYYY-MM-DD)'),
];

const createViolationValidation = [
  body('student_id').notEmpty().withMessage('student_id is required').isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  body('class_id').notEmpty().withMessage('class_id is required').isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  body('academic_year_id').notEmpty().withMessage('academic_year_id is required').isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  body('violation_type_id').notEmpty().withMessage('violation_type_id is required').isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  body('violation_date').notEmpty().withMessage('violation_date is required').isISO8601().withMessage('violation_date must be a valid date (YYYY-MM-DD)'),
  body('points').optional().isInt({ min: 0, max: 1000 }).withMessage('points must be between 0 and 1000').toInt(),
  body('description').notEmpty().withMessage('description is required').trim().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('notes must be at most 255 characters'),
];

const createBulkViolationValidation = [
  body('student_ids').isArray({ min: 1 }).withMessage('student_ids must be a non-empty array'),
  body('student_ids.*').isInt({ min: 1 }).withMessage('each student_id must be a positive integer').toInt(),
  body('class_id').notEmpty().withMessage('class_id is required').isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  body('academic_year_id').notEmpty().withMessage('academic_year_id is required').isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  body('violation_type_id').notEmpty().withMessage('violation_type_id is required').isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  body('violation_date').notEmpty().withMessage('violation_date is required').isISO8601().withMessage('violation_date must be a valid date (YYYY-MM-DD)'),
  body('points').optional().isInt({ min: 0, max: 1000 }).withMessage('points must be between 0 and 1000').toInt(),
  body('description').notEmpty().withMessage('description is required').trim().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('notes must be at most 255 characters'),
];

const updateViolationValidation = [
  ...violationIdParamValidation,
  body('student_id').optional().isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  body('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  body('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  body('violation_type_id').optional().isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  body('violation_date').optional().isISO8601().withMessage('violation_date must be a valid date (YYYY-MM-DD)'),
  body('points').optional().isInt({ min: 0, max: 1000 }).withMessage('points must be between 0 and 1000').toInt(),
  body('description').optional().trim().isLength({ max: 255 }).withMessage('description must be at most 255 characters'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('notes must be at most 255 characters'),
];

const violationSummaryValidation = [
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  query('violation_type_id').optional().isInt({ min: 1 }).withMessage('violation_type_id must be a positive integer').toInt(),
  query('severity').optional().isIn(VIOLATION_SEVERITIES).withMessage(`severity must be one of: ${VIOLATION_SEVERITIES.join(', ')}`),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid date (YYYY-MM-DD)'),
];

module.exports = {
  VIOLATION_SEVERITIES,
  violationIdParamValidation,
  violationTypeIdParamValidation,
  getViolationTypesValidation,
  createViolationTypeValidation,
  updateViolationTypeValidation,
  getViolationsValidation,
  getViolationStudentsValidation,
  createViolationValidation,
  createBulkViolationValidation,
  updateViolationValidation,
  violationSummaryValidation,
};
