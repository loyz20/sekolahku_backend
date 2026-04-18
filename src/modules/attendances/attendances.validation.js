const { body, param, query } = require('express-validator');

const ATTENDANCE_STATUSES = ['hadir', 'izin', 'sakit', 'alpha'];

const attendanceIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const getAttendancesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('student_id').optional().isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  query('subject_id').optional().isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid date (YYYY-MM-DD)'),
  query('status').optional().isIn(ATTENDANCE_STATUSES).withMessage(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
];

const createAttendanceValidation = [
  body('student_id').notEmpty().withMessage('student_id is required').isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  body('subject_id').notEmpty().withMessage('subject_id is required').isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  body('date').notEmpty().withMessage('date is required').isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  body('status').notEmpty().withMessage('status is required').isIn(ATTENDANCE_STATUSES).withMessage(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
  body('notes').optional({ nullable: true }).isLength({ max: 255 }).withMessage('notes must be at most 255 characters'),
];

const updateAttendanceValidation = [
  ...attendanceIdParamValidation,
  body('status').optional().isIn(ATTENDANCE_STATUSES).withMessage(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
  body('notes').optional({ nullable: true }).isLength({ max: 255 }).withMessage('notes must be at most 255 characters'),
];

const bulkUpsertAttendancesValidation = [
  body('subject_id').notEmpty().withMessage('subject_id is required').isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  body('date').notEmpty().withMessage('date is required').isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
  body('entries').isArray({ min: 1 }).withMessage('entries must be a non-empty array'),
  body('entries.*.student_id').notEmpty().withMessage('entries.*.student_id is required').isInt({ min: 1 }).withMessage('entries.*.student_id must be a positive integer').toInt(),
  body('entries.*.status').notEmpty().withMessage('entries.*.status is required').isIn(ATTENDANCE_STATUSES).withMessage(`entries.*.status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`),
  body('entries.*.notes').optional({ nullable: true }).isLength({ max: 255 }).withMessage('entries.*.notes must be at most 255 characters'),
];

const attendanceSummaryValidation = [
  query('subject_id').optional().isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  query('student_id').optional().isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid date (YYYY-MM-DD)'),
];

module.exports = {
  ATTENDANCE_STATUSES,
  attendanceIdParamValidation,
  getAttendancesValidation,
  createAttendanceValidation,
  updateAttendanceValidation,
  bulkUpsertAttendancesValidation,
  attendanceSummaryValidation,
};
