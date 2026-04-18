const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const schedulesService = require('./schedules.service');

const addClassSubject = catchAsync(async (req, res) => {
  const { class_id, subject_id, academic_year_id, notes } = req.body;

  const result = await schedulesService.addClassSubject({
    classId: class_id,
    subjectId: subject_id,
    academicYearId: academic_year_id,
    actorUserId: req.user.id,
    notes,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Class subject added successfully',
    data: result,
  });
});

const revokeClassSubject = catchAsync(async (req, res) => {
  const notes = req.body?.notes;

  const result = await schedulesService.revokeClassSubject({
    classSubjectId: parseInt(req.params.id, 10),
    actorUserId: req.user.id,
    notes,
  });

  sendResponse(res, {
    message: 'Class subject revoked successfully',
    data: result,
  });
});

const deleteClassSubjectPermanent = catchAsync(async (req, res) => {
  const result = await schedulesService.deleteClassSubjectPermanent(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Class subject deleted permanently',
    data: result,
  });
});

const getClassSubjects = catchAsync(async (req, res) => {
  const result = await schedulesService.getClassSubjects({
    classId: req.query.class_id || undefined,
    academicYearId: req.query.academic_year_id || undefined,
    subjectId: req.query.subject_id || undefined,
    includeInactive: req.query.include_inactive === 'true',
  });

  sendResponse(res, {
    message: 'Class subjects fetched successfully',
    data: result,
  });
});

const assignTeacher = catchAsync(async (req, res) => {
  const { class_subject_id, teacher_id, notes } = req.body;

  const result = await schedulesService.assignTeacher({
    classSubjectId: class_subject_id,
    teacherId: teacher_id,
    actorUserId: req.user.id,
    notes,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Teacher assigned successfully',
    data: result,
  });
});

const revokeTeacherAssignment = catchAsync(async (req, res) => {
  const notes = req.body?.notes;

  const result = await schedulesService.revokeTeacherAssignment({
    assignmentId: parseInt(req.params.id, 10),
    actorUserId: req.user.id,
    notes,
  });

  sendResponse(res, {
    message: 'Teacher assignment revoked successfully',
    data: result,
  });
});

const deleteTeachingAssignmentPermanent = catchAsync(async (req, res) => {
  const result = await schedulesService.deleteTeachingAssignmentPermanent(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Teaching assignment deleted permanently',
    data: result,
  });
});

const getTeachingAssignments = catchAsync(async (req, res) => {
  const result = await schedulesService.getTeachingAssignments({
    classId: req.query.class_id || undefined,
    academicYearId: req.query.academic_year_id || undefined,
    teacherId: req.query.teacher_id || undefined,
    includeInactive: req.query.include_inactive === 'true',
  });

  sendResponse(res, {
    message: 'Teaching assignments fetched successfully',
    data: result,
  });
});

const addScheduleSlot = catchAsync(async (req, res) => {
  const {
    class_id,
    academic_year_id,
    slot_type,
    title,
    class_subject_id,
    teaching_assignment_id,
    day_of_week,
    start_time,
    end_time,
    room,
    notes,
  } = req.body;

  const result = await schedulesService.addScheduleSlot({
    classId: class_id,
    academicYearId: academic_year_id,
    slotType: slot_type || 'lesson',
    title,
    classSubjectId: class_subject_id,
    teachingAssignmentId: teaching_assignment_id,
    dayOfWeek: day_of_week,
    startTime: start_time,
    endTime: end_time,
    room,
    notes,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Schedule slot created successfully',
    data: result,
  });
});

const addScheduleSlotsBatch = catchAsync(async (req, res) => {
  const slots = req.body.slots || [];

  const result = await schedulesService.addScheduleSlotsBatch({
    slots,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Schedule slots created successfully',
    data: result,
  });
});

const updateScheduleSlot = catchAsync(async (req, res) => {
  const payload = {
    dayOfWeek: req.body.day_of_week,
    startTime: req.body.start_time,
    endTime: req.body.end_time,
    room: req.body.room,
    notes: req.body.notes,
  };

  const result = await schedulesService.updateScheduleSlot(parseInt(req.params.id, 10), payload);

  sendResponse(res, {
    message: 'Schedule slot updated successfully',
    data: result,
  });
});

const updateScheduleSlotsBatch = catchAsync(async (req, res) => {
  const slots = req.body.slots || [];

  const result = await schedulesService.updateScheduleSlotsBatch({
    slots,
  });

  sendResponse(res, {
    message: 'Schedule slots updated successfully',
    data: result,
  });
});

const deleteScheduleSlot = catchAsync(async (req, res) => {
  await schedulesService.deleteScheduleSlot(parseInt(req.params.id, 10), req.user.id);

  sendResponse(res, {
    message: 'Schedule slot deleted successfully',
  });
});

const getClassSchedule = catchAsync(async (req, res) => {
  const result = await schedulesService.getClassSchedule({
    classId: parseInt(req.params.classId, 10),
    academicYearId: parseInt(req.params.academicYearId, 10),
  });

  sendResponse(res, {
    message: 'Class schedule fetched successfully',
    data: result,
  });
});

const getTeacherSchedule = catchAsync(async (req, res) => {
  const result = await schedulesService.getTeacherSchedule({
    teacherId: parseInt(req.params.teacherId, 10),
    academicYearId: parseInt(req.params.academicYearId, 10),
  });

  sendResponse(res, {
    message: 'Teacher schedule fetched successfully',
    data: result,
  });
});

const getStudentSchedule = catchAsync(async (req, res) => {
  const result = await schedulesService.getStudentSchedule({
    studentId: parseInt(req.params.studentId, 10),
    academicYearId: parseInt(req.params.academicYearId, 10),
    requester: {
      id: req.user.id,
      duties: req.user.duties,
      role: req.user.role,
    },
  });

  sendResponse(res, {
    message: 'Student schedule fetched successfully',
    data: result,
  });
});

module.exports = {
  addClassSubject,
  revokeClassSubject,
  deleteClassSubjectPermanent,
  getClassSubjects,
  assignTeacher,
  revokeTeacherAssignment,
  deleteTeachingAssignmentPermanent,
  getTeachingAssignments,
  addScheduleSlot,
  addScheduleSlotsBatch,
  updateScheduleSlot,
  updateScheduleSlotsBatch,
  deleteScheduleSlot,
  getClassSchedule,
  getTeacherSchedule,
  getStudentSchedule,
};
