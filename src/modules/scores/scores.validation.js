const { body, param, query } = require('express-validator');

const scoreIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const getScoresValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('student_id').optional().isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  query('subject_id').optional().isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  query('assessment_id').optional().isInt({ min: 1 }).withMessage('assessment_id must be a positive integer').toInt(),
  query('academic_year_id').optional().isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
];

const createScoreValidation = [
  body('student_id').notEmpty().withMessage('student_id is required').isInt({ min: 1 }).withMessage('student_id must be a positive integer').toInt(),
  body('subject_id').notEmpty().withMessage('subject_id is required').isInt({ min: 1 }).withMessage('subject_id must be a positive integer').toInt(),
  body('assessment_id').notEmpty().withMessage('assessment_id is required').isInt({ min: 1 }).withMessage('assessment_id must be a positive integer').toInt(),
  body('academic_year_id').notEmpty().withMessage('academic_year_id is required').isInt({ min: 1 }).withMessage('academic_year_id must be a positive integer').toInt(),
  body('nilai').notEmpty().withMessage('nilai is required').isFloat({ min: 0, max: 100 }).withMessage('nilai must be between 0 and 100').toFloat(),
];

const updateScoreValidation = [
  ...scoreIdParamValidation,
  body('nilai').notEmpty().withMessage('nilai is required').isFloat({ min: 0, max: 100 }).withMessage('nilai must be between 0 and 100').toFloat(),
];

module.exports = {
  scoreIdParamValidation,
  getScoresValidation,
  createScoreValidation,
  updateScoreValidation,
};
