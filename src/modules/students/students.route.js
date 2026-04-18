const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const studentsController = require('./students.controller');
const {
  getStudentsValidation,
  studentIdParamValidation,
  createStudentValidation,
  updateStudentValidation,
  enrollStudentValidation,
  enrollmentIdParamValidation,
} = require('./students.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getStudentsValidation),
  studentsController.getStudents
);

router.post(
  '/',
  authorize('admin', 'superadmin'),
  validate(createStudentValidation),
  studentsController.createStudent
);

// Upload Excel import
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.post(
  '/import',
  authorize('admin', 'superadmin'),
  upload.single('file'),
  studentsController.importStudents
);

// Download import template
router.get(
  '/import/template/download',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  studentsController.getImportTemplate
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(studentIdParamValidation),
  studentsController.getStudentById
);

router.patch(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(updateStudentValidation),
  studentsController.updateStudent
);

router.patch(
  '/:id/status',
  authorize('admin', 'superadmin'),
  validate(studentIdParamValidation),
  studentsController.toggleStudentStatus
);

router.delete(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(studentIdParamValidation),
  studentsController.deleteStudent
);

router.post(
  '/:id/enrollments',
  authorize('admin', 'superadmin'),
  validate(enrollStudentValidation),
  studentsController.enrollStudent
);

router.delete(
  '/:id/enrollments/:enrollmentId',
  authorize('admin', 'superadmin'),
  validate(studentIdParamValidation),
  validate(enrollmentIdParamValidation),
  studentsController.disenrollStudent
);

module.exports = router;
