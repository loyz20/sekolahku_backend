const { body, param, query } = require('express-validator');

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const idParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const classYearParamValidation = [
  param('classId').isInt({ min: 1 }).withMessage('classId must be a positive integer').toInt(),
  param('academicYearId')
    .isInt({ min: 1 })
    .withMessage('academicYearId must be a positive integer')
    .toInt(),
];

const teacherYearParamValidation = [
  param('teacherId').isInt({ min: 1 }).withMessage('teacherId must be a positive integer').toInt(),
  param('academicYearId')
    .isInt({ min: 1 })
    .withMessage('academicYearId must be a positive integer')
    .toInt(),
];

const studentYearParamValidation = [
  param('studentId').isInt({ min: 1 }).withMessage('studentId must be a positive integer').toInt(),
  param('academicYearId')
    .isInt({ min: 1 })
    .withMessage('academicYearId must be a positive integer')
    .toInt(),
];

const getClassSubjectsValidation = [
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be positive integer').toInt(),
  query('academic_year_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be positive integer')
    .toInt(),
  query('subject_id').optional().isInt({ min: 1 }).withMessage('subject_id must be positive integer').toInt(),
  query('include_inactive').optional().isBoolean().withMessage('include_inactive must be boolean').toBoolean(),
];

const addClassSubjectValidation = [
  body('class_id').isInt({ min: 1 }).withMessage('class_id must be positive integer').toInt(),
  body('subject_id').isInt({ min: 1 }).withMessage('subject_id must be positive integer').toInt(),
  body('academic_year_id')
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be positive integer')
    .toInt(),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
];

const revokeClassSubjectValidation = [
  ...idParamValidation,
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
];

const assignTeacherValidation = [
  body('class_subject_id').isInt({ min: 1 }).withMessage('class_subject_id must be positive integer').toInt(),
  body('teacher_id').isInt({ min: 1 }).withMessage('teacher_id must be positive integer').toInt(),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
];

const revokeTeacherAssignmentValidation = [
  ...idParamValidation,
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
];

const getTeachingAssignmentsValidation = [
  query('class_id').optional().isInt({ min: 1 }).withMessage('class_id must be positive integer').toInt(),
  query('academic_year_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be positive integer')
    .toInt(),
  query('teacher_id').optional().isInt({ min: 1 }).withMessage('teacher_id must be positive integer').toInt(),
  query('include_inactive').optional().isBoolean().withMessage('include_inactive must be boolean').toBoolean(),
];

const addSlotValidation = [
  body('class_id')
    .isInt({ min: 1 })
    .withMessage('class_id must be positive integer')
    .toInt(),
  body('academic_year_id')
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be positive integer')
    .toInt(),
  body('slot_type')
    .optional()
    .isIn(['lesson', 'ceremony', 'break'])
    .withMessage('slot_type must be one of: lesson, ceremony, break'),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('title max 100 chars'),
  body('class_subject_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('class_subject_id must be positive integer')
    .toInt(),
  body('teaching_assignment_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('teaching_assignment_id must be positive integer')
    .toInt(),
  body('day_of_week').isInt({ min: 1, max: 7 }).withMessage('day_of_week must be between 1 and 7').toInt(),
  body('start_time').matches(timeRegex).withMessage('start_time must be HH:mm or HH:mm:ss'),
  body('end_time').matches(timeRegex).withMessage('end_time must be HH:mm or HH:mm:ss'),
  body('room').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('room max 50 chars'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
  body('class_subject_id').custom((value, { req }) => {
    const slotType = req.body.slot_type || 'lesson';
    if (slotType === 'lesson' && !value) {
      throw new Error('class_subject_id is required for lesson slot');
    }
    return true;
  }),
];

const addSlotBatchValidation = [
  body('slots').isArray({ min: 1 }).withMessage('slots must be a non-empty array'),
  body('slots.*.class_id').isInt({ min: 1 }).withMessage('class_id must be positive integer').toInt(),
  body('slots.*.academic_year_id')
    .isInt({ min: 1 })
    .withMessage('academic_year_id must be positive integer')
    .toInt(),
  body('slots.*.slot_type')
    .optional()
    .isIn(['lesson', 'ceremony', 'break'])
    .withMessage('slot_type must be one of: lesson, ceremony, break'),
  body('slots.*.title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('title max 100 chars'),
  body('slots.*.class_subject_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('class_subject_id must be positive integer')
    .toInt(),
  body('slots.*.teaching_assignment_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('teaching_assignment_id must be positive integer')
    .toInt(),
  body('slots.*.day_of_week')
    .isInt({ min: 1, max: 7 })
    .withMessage('day_of_week must be between 1 and 7')
    .toInt(),
  body('slots.*.start_time').matches(timeRegex).withMessage('start_time must be HH:mm or HH:mm:ss'),
  body('slots.*.end_time').matches(timeRegex).withMessage('end_time must be HH:mm or HH:mm:ss'),
  body('slots.*.room')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('room max 50 chars'),
  body('slots.*.notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('notes max 255 chars'),
];

const updateSlotValidation = [
  ...idParamValidation,
  body('day_of_week').optional().isInt({ min: 1, max: 7 }).withMessage('day_of_week must be between 1 and 7').toInt(),
  body('start_time').optional().matches(timeRegex).withMessage('start_time must be HH:mm or HH:mm:ss'),
  body('end_time').optional().matches(timeRegex).withMessage('end_time must be HH:mm or HH:mm:ss'),
  body('room').optional({ nullable: true }).trim().isLength({ max: 50 }).withMessage('room max 50 chars'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
];

const updateSlotBatchValidation = [
  body('slots').isArray({ min: 1 }).withMessage('slots must be a non-empty array'),
  body('slots.*.id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
  body('slots.*.day_of_week')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('day_of_week must be between 1 and 7')
    .toInt(),
  body('slots.*.start_time').optional().matches(timeRegex).withMessage('start_time must be HH:mm or HH:mm:ss'),
  body('slots.*.end_time').optional().matches(timeRegex).withMessage('end_time must be HH:mm or HH:mm:ss'),
  body('slots.*.room').optional({ nullable: true }).trim().isLength({ max: 50 }).withMessage('room max 50 chars'),
  body('slots.*.notes').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('notes max 255 chars'),
  body('slots').custom((slots) => {
    for (const slot of slots) {
      const hasAnyField =
        slot.day_of_week !== undefined ||
        slot.start_time !== undefined ||
        slot.end_time !== undefined ||
        slot.room !== undefined ||
        slot.notes !== undefined;

      if (!hasAnyField) {
        throw new Error('each slot must include at least one updatable field');
      }
    }

    return true;
  }),
];

module.exports = {
  idParamValidation,
  classYearParamValidation,
  teacherYearParamValidation,
  studentYearParamValidation,
  getClassSubjectsValidation,
  addClassSubjectValidation,
  revokeClassSubjectValidation,
  assignTeacherValidation,
  revokeTeacherAssignmentValidation,
  getTeachingAssignmentsValidation,
  addSlotValidation,
  addSlotBatchValidation,
  updateSlotValidation,
  updateSlotBatchValidation,
};
