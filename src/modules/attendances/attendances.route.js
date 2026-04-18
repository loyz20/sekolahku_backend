const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const attendancesController = require('./attendances.controller');
const {
  attendanceIdParamValidation,
  getAttendancesValidation,
  createAttendanceValidation,
  updateAttendanceValidation,
  bulkUpsertAttendancesValidation,
  attendanceSummaryValidation,
} = require('./attendances.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getAttendancesValidation),
  attendancesController.getAttendances
);

router.get(
  '/summary',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(attendanceSummaryValidation),
  attendancesController.getAttendanceSummary
);

router.post(
  '/',
  authorize('admin', 'guru', 'superadmin'),
  validate(createAttendanceValidation),
  attendancesController.createAttendance
);

router.post(
  '/bulk-upsert',
  authorize('admin', 'guru', 'superadmin'),
  validate(bulkUpsertAttendancesValidation),
  attendancesController.bulkUpsertAttendances
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(attendanceIdParamValidation),
  attendancesController.getAttendanceById
);

router.patch(
  '/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(updateAttendanceValidation),
  attendancesController.updateAttendance
);

router.delete(
  '/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(attendanceIdParamValidation),
  attendancesController.deleteAttendance
);

module.exports = router;
