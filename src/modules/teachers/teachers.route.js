const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const teachersController = require('./teachers.controller');
const {
  getTeachersValidation,
  teacherIdValidation,
  createTeacherValidation,
  updateTeacherValidation,
} = require('./teachers.validation');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

// GET /teachers - List all teachers
router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getTeachersValidation),
  teachersController.getTeachers
);

// POST /teachers - Create teacher
router.post(
  '/',
  authorize('admin', 'superadmin'),
  validate(createTeacherValidation),
  teachersController.createTeacher
);

// POST /teachers/import - Import teachers from excel
router.post(
  '/import',
  authorize('admin', 'superadmin'),
  upload.single('file'),
  teachersController.importTeachers
);

// GET /teachers/import/template/download - Download import template
router.get(
  '/import/template/download',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  teachersController.getImportTemplate
);

// GET /teachers/:id - Get teacher detail
router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(teacherIdValidation),
  teachersController.getTeacherById
);

// PATCH /teachers/:id - Update teacher
router.patch(
  '/:id',
  authorize('admin', 'superadmin'),
  validate([...teacherIdValidation, ...updateTeacherValidation]),
  teachersController.updateTeacher
);

// PATCH /teachers/:id/status - Toggle teacher status
router.patch(
  '/:id/status',
  authorize('admin', 'superadmin'),
  validate(teacherIdValidation),
  teachersController.toggleTeacherStatus
);

// DELETE /teachers/:id - Delete teacher
router.delete(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(teacherIdValidation),
  teachersController.deleteTeacher
);

module.exports = router;
