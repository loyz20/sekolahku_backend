const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const attendancesController = require('./attendances.controller');
const {
  getMeetingsValidation,
  meetingIdParamValidation,
  createMeetingValidation,
  updateMeetingValidation,
  upsertMeetingAttendanceValidation,
} = require('./attendances.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/meetings',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getMeetingsValidation),
  attendancesController.getMeetings
);

router.get(
  '/meetings/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(meetingIdParamValidation),
  attendancesController.getMeetingById
);

router.post(
  '/meetings',
  authorize('admin', 'guru', 'superadmin'),
  validate(createMeetingValidation),
  attendancesController.createMeeting
);

router.patch(
  '/meetings/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(updateMeetingValidation),
  attendancesController.updateMeeting
);

router.put(
  '/meetings/:id/attendance',
  authorize('admin', 'guru', 'superadmin'),
  validate(upsertMeetingAttendanceValidation),
  attendancesController.upsertMeetingAttendance
);

router.delete(
  '/meetings/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(meetingIdParamValidation),
  attendancesController.deleteMeeting
);

module.exports = router;
