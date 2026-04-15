const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const classesController = require('./classes.controller');
const {
  getClassesValidation,
  classIdParamValidation,
  createClassValidation,
  updateClassValidation,
} = require('./classes.validation');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getClassesValidation),
  classesController.getClasses
);

router.post(
  '/',
  authorize('admin', 'superadmin'),
  validate(createClassValidation),
  classesController.createClass
);

router.post(
  '/import',
  authorize('admin', 'superadmin'),
  upload.single('file'),
  classesController.importClasses
);

router.get(
  '/import/template/download',
  authorize('admin', 'kepala_sekolah', 'superadmin'),
  classesController.getImportTemplate
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(classIdParamValidation),
  classesController.getClassById
);

router.patch(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(updateClassValidation),
  classesController.updateClass
);

router.delete(
  '/:id',
  authorize('superadmin'),
  validate(classIdParamValidation),
  classesController.deleteClass
);

module.exports = router;
