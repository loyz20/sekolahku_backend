const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const schedulesController = require('./schedules.controller');
const {
  idParamValidation,
  classYearParamValidation,
  teacherYearParamValidation,
  studentYearParamValidation,
  getClassSubjectsValidation,
  addClassSubjectValidation,
  revokeClassSubjectValidation,
  assignTeacherValidation,
  revokeTeacherAssignmentValidation,
  getTeachingAssignmentsValidation,
  addSlotValidation,
  updateSlotValidation,
} = require('./schedules.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/classes/:classId/by-year/:academicYearId',
  authorize('admin', 'kepala_sekolah', 'guru', 'superadmin'),
  validate(classYearParamValidation),
  schedulesController.getClassSchedule
);

router.get(
  '/teachers/:teacherId/by-year/:academicYearId',
  authorize('admin', 'kepala_sekolah', 'guru', 'superadmin'),
  validate(teacherYearParamValidation),
  schedulesController.getTeacherSchedule
);

router.get(
  '/students/:studentId/by-year/:academicYearId',
  validate(studentYearParamValidation),
  schedulesController.getStudentSchedule
);

router.get(
  '/class-subjects',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getClassSubjectsValidation),
  schedulesController.getClassSubjects
);

router.get(
  '/teaching-assignments',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getTeachingAssignmentsValidation),
  schedulesController.getTeachingAssignments
);

router.use(authorize('admin', 'superadmin'));

router.post('/class-subjects', validate(addClassSubjectValidation), schedulesController.addClassSubject);
router.post('/class-subjects/:id/revoke', validate(revokeClassSubjectValidation), schedulesController.revokeClassSubject);
router.delete(
  '/class-subjects/:id',
  authorize('admin', 'superadmin'),
  validate(idParamValidation),
  schedulesController.deleteClassSubjectPermanent
);

router.post('/teaching-assignments', validate(assignTeacherValidation), schedulesController.assignTeacher);
router.post(
  '/teaching-assignments/:id/revoke',
  validate(revokeTeacherAssignmentValidation),
  schedulesController.revokeTeacherAssignment
);
router.delete(
  '/teaching-assignments/:id',
  authorize('admin', 'superadmin'),
  validate(idParamValidation),
  schedulesController.deleteTeachingAssignmentPermanent
);

router.post('/slots', validate(addSlotValidation), schedulesController.addScheduleSlot);
router.patch('/slots/:id', validate(updateSlotValidation), schedulesController.updateScheduleSlot);
router.delete('/slots/:id', validate(idParamValidation), schedulesController.deleteScheduleSlot);

module.exports = router;
