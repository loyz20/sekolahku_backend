const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const academicYearsController = require('./academic-years.controller');
const {
  getAcademicYearsValidation,
  academicYearIdParamValidation,
  createAcademicYearValidation,
  updateAcademicYearValidation,
} = require('./academic-years.validation');

const router = express.Router();

router.get(
  '/public',
  validate(getAcademicYearsValidation),
  academicYearsController.getAcademicYearsPublic
);

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'kepala_sekolah', 'superadmin'),
  validate(getAcademicYearsValidation),
  academicYearsController.getAcademicYears
);

router.post(
  '/',
  authorize('admin', 'superadmin'),
  validate(createAcademicYearValidation),
  academicYearsController.createAcademicYear
);

router.get(
  '/:id',
  authorize('admin', 'kepala_sekolah', 'superadmin'),
  validate(academicYearIdParamValidation),
  academicYearsController.getAcademicYearById
);

router.patch(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(updateAcademicYearValidation),
  academicYearsController.updateAcademicYear
);

router.patch(
  '/:id/activate',
  authorize('admin', 'superadmin'),
  validate(academicYearIdParamValidation),
  academicYearsController.activateAcademicYear
);

router.delete(
  '/:id',
  authorize('superadmin'),
  validate(academicYearIdParamValidation),
  academicYearsController.deleteAcademicYear
);

module.exports = router;
