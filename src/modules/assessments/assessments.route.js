const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const assessmentsController = require('./assessments.controller');
const {
  getAssessmentsValidation,
  assessmentIdParamValidation,
  createAssessmentValidation,
  updateAssessmentValidation,
} = require('./assessments.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getAssessmentsValidation),
  assessmentsController.getAssessments
);

router.post(
  '/',
  authorize('admin', 'guru', 'superadmin'),
  validate(createAssessmentValidation),
  assessmentsController.createAssessment
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(assessmentIdParamValidation),
  assessmentsController.getAssessmentById
);

router.patch(
  '/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(updateAssessmentValidation),
  assessmentsController.updateAssessment
);

router.delete(
  '/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(assessmentIdParamValidation),
  assessmentsController.deleteAssessment
);

module.exports = router;
