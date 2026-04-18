const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const subjectsController = require('./subjects.controller');
const {
  getSubjectsValidation,
  subjectIdParamValidation,
  createSubjectValidation,
  updateSubjectValidation,
} = require('./subjects.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getSubjectsValidation),
  subjectsController.getSubjects
);

router.post(
  '/',
  authorize('admin', 'superadmin'),
  validate(createSubjectValidation),
  subjectsController.createSubject
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(subjectIdParamValidation),
  subjectsController.getSubjectById
);

router.patch(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(updateSubjectValidation),
  subjectsController.updateSubject
);

router.patch(
  '/:id/status',
  authorize('admin', 'superadmin'),
  validate(subjectIdParamValidation),
  subjectsController.toggleSubjectStatus
);

router.delete(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(subjectIdParamValidation),
  subjectsController.deleteSubject
);

module.exports = router;
