const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const violationsController = require('./violations.controller');
const {
  violationIdParamValidation,
  violationTypeIdParamValidation,
  getViolationTypesValidation,
  createViolationTypeValidation,
  updateViolationTypeValidation,
  getViolationsValidation,
  getViolationStudentsValidation,
  createViolationValidation,
  createBulkViolationValidation,
  updateViolationValidation,
  violationSummaryValidation,
} = require('./violations.validation');

const router = express.Router();

router.use(authenticate);

router.get('/types', authorize('admin', 'guru', 'superadmin'), validate(getViolationTypesValidation), violationsController.getViolationTypes);
router.get('/types/:id', authorize('admin', 'guru', 'superadmin'), validate(violationTypeIdParamValidation), violationsController.getViolationTypeById);
router.post('/types', authorize('admin', 'superadmin'), validate(createViolationTypeValidation), violationsController.createViolationType);
router.patch('/types/:id', authorize('admin', 'superadmin'), validate(updateViolationTypeValidation), violationsController.updateViolationType);
router.delete('/types/:id', authorize('admin', 'superadmin'), validate(violationTypeIdParamValidation), violationsController.deleteViolationType);

router.get('/', authorize('admin', 'guru', 'superadmin'), validate(getViolationsValidation), violationsController.getViolations);
router.get('/students', authorize('admin', 'guru', 'superadmin'), validate(getViolationStudentsValidation), violationsController.getViolationStudents);
router.get('/summary', authorize('admin', 'guru', 'superadmin'), validate(violationSummaryValidation), violationsController.getViolationSummary);
router.get('/:id', authorize('admin', 'guru', 'superadmin'), validate(violationIdParamValidation), violationsController.getViolationById);
router.post('/', authorize('admin', 'guru', 'superadmin'), validate(createViolationValidation), violationsController.createViolation);
router.post('/bulk', authorize('admin', 'guru', 'superadmin'), validate(createBulkViolationValidation), violationsController.createBulkViolation);
router.patch('/:id', authorize('admin', 'guru', 'superadmin'), validate(updateViolationValidation), violationsController.updateViolation);
router.delete('/:id', authorize('admin', 'guru', 'superadmin'), validate(violationIdParamValidation), violationsController.deleteViolation);

module.exports = router;
