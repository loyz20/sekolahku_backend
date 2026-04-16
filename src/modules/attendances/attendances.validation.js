const { body, param, query } = require('express-validator');

const attendanceStatuses = ['HADIR', 'SAKIT', 'IZIN', 'ALPA'];

const meetingIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const getMeetingsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be a positive integer').toInt(),
  query('subject_id').optional().isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  query('teacher_id').optional().isInt({ min: 1 }).withMessage('teacher_id must be a positive integer').toInt(),
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  query('meeting_date').optional().isISO8601().withMessage('meeting_date must be a valid date (YYYY-MM-DD)').toDate(),
];

const createMeetingValidation = [
  body('teaching_assignment_id')
    .notEmpty()
    .withMessage('teaching_assignment_id is required')
    .isInt({ min: 1 })
    .withMessage('teaching_assignment_id must be a positive integer')
    .toInt(),
  body('meeting_no')
    .optional()
    .isInt({ min: 1 })
    .withMessage('meeting_no must be a positive integer')
    .toInt(),
  body('meeting_date')
    .notEmpty()
    .withMessage('meeting_date is required')
    .isISO8601()
    .withMessage('meeting_date must be a valid date (YYYY-MM-DD)'),
  body('topic').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('topic maximum length is 255 characters'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('notes maximum length is 500 characters'),
];

const updateMeetingValidation = [
  ...meetingIdParamValidation,
  body('meeting_no')
    .optional()
    .isInt({ min: 1 })
    .withMessage('meeting_no must be a positive integer')
    .toInt(),
  body('meeting_date')
    .optional()
    .isISO8601()
    .withMessage('meeting_date must be a valid date (YYYY-MM-DD)'),
  body('topic').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('topic maximum length is 255 characters'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('notes maximum length is 500 characters'),
];

const upsertMeetingAttendanceValidation = [
  ...meetingIdParamValidation,
  body('records')
    .isArray({ min: 1 })
    .withMessage('records must be a non-empty array'),
  body('records.*.student_id')
    .notEmpty()
    .withMessage('student_id is required')
    .isInt({ min: 1 })
    .withMessage('student_id must be a positive integer')
    .toInt(),
  body('records.*.status')
    .notEmpty()
    .withMessage('status is required')
    .customSanitizer((value) => String(value).toUpperCase())
    .isIn(attendanceStatuses)
    .withMessage(`status must be one of: ${attendanceStatuses.join(', ')}`),
  body('records.*.notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('notes maximum length is 255 characters'),
];

module.exports = {
  attendanceStatuses,
  meetingIdParamValidation,
  getMeetingsValidation,
  createMeetingValidation,
  updateMeetingValidation,
  upsertMeetingAttendanceValidation,
};
