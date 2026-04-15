const express = require('express');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const dutyController = require('./duty.controller');
const {
  getdutiesValidation,
  assignDutyValidation,
  revokeDutyValidation,
  assignHomeroomValidation,
  revokeHomeroomValidation,
  userIdParamValidation,
} = require('./duty.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'kepala_sekolah', 'guru', 'superadmin'),
  validate(getdutiesValidation),
  dutyController.getDuties
);

router.use(authorize('admin', 'kepala_sekolah'));

router.post('/assign', validate(assignDutyValidation), dutyController.assignDuty);
router.post('/revoke', validate(revokeDutyValidation), dutyController.revokeDuty);
router.post('/homeroom/assign', validate(assignHomeroomValidation), dutyController.assignHomeroom);
router.post('/homeroom/revoke', validate(revokeHomeroomValidation), dutyController.revokeHomeroom);
router.get('/users/:userId/active', validate(userIdParamValidation), dutyController.getUserActiveAssignments);

module.exports = router;
