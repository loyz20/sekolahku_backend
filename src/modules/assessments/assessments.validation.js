const { body, param, query } = require('express-validator');

const assessmentIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('id is required')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const getAssessmentsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search maximum length is 100 characters'),
  query('nama_penilaian').optional().trim().isLength({ min: 2, max: 100 }).withMessage('nama_penilaian must be between 2 and 100 characters'),
  query('teacher_id').optional().isInt({ min: 1 }).withMessage('teacher_id must be a positive integer').toInt(),
  query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
];

const createAssessmentValidation = [
  body('nama_penilaian')
    .notEmpty()
    .withMessage('nama_penilaian is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('nama_penilaian must be between 2 and 100 characters'),
  body('bobot')
    .notEmpty()
    .withMessage('bobot is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('bobot must be between 0 and 100')
    .toFloat(),
  body('description').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('description maximum length is 255 characters'),
  body('teacher_id').optional().isInt({ min: 1 }).withMessage('teacher_id must be a positive integer').toInt(),
];

const updateAssessmentValidation = [
  ...assessmentIdParamValidation,
  body('nama_penilaian')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('nama_penilaian must be between 2 and 100 characters'),
  body('bobot')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('bobot must be between 0 and 100')
    .toFloat(),
  body('description').optional({ nullable: true }).trim().isLength({ max: 255 }).withMessage('description maximum length is 255 characters'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean').toBoolean(),
];

module.exports = {
  assessmentIdParamValidation,
  getAssessmentsValidation,
  createAssessmentValidation,
  updateAssessmentValidation,
};
