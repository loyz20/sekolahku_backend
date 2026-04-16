const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const attendancesService = require('./attendances.service');

const getMeetings = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const result = await attendancesService.getMeetings({
    page,
    limit,
    classId: req.query.class_id || '',
    subjectId: req.query.subject_id || '',
    teacherId: req.query.teacher_id || '',
    academicYearId: req.query.academic_year_id || '',
    meetingDate: req.query.meeting_date || '',
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Meetings fetched successfully',
    data: result.meetings,
    meta: result.meta,
  });
});

const getMeetingById = catchAsync(async (req, res) => {
  const meeting = await attendancesService.getMeetingById(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Meeting fetched successfully',
    data: meeting,
  });
});

const createMeeting = catchAsync(async (req, res) => {
  const { teaching_assignment_id, meeting_no, meeting_date, topic, notes } = req.body;

  const meeting = await attendancesService.createMeeting({
    teaching_assignment_id,
    meeting_no,
    meeting_date,
    topic,
    notes,
  }, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Meeting created successfully',
    data: meeting,
  });
});

const updateMeeting = catchAsync(async (req, res) => {
  const { meeting_no, meeting_date, topic, notes } = req.body;

  const meeting = await attendancesService.updateMeeting(
    parseInt(req.params.id, 10),
    { meeting_no, meeting_date, topic, notes },
    req.user
  );

  sendResponse(res, {
    message: 'Meeting updated successfully',
    data: meeting,
  });
});

const upsertMeetingAttendance = catchAsync(async (req, res) => {
  const result = await attendancesService.upsertMeetingAttendance(
    parseInt(req.params.id, 10),
    req.body.records,
    req.user
  );

  sendResponse(res, {
    message: 'Meeting attendance saved successfully',
    data: result,
  });
});

const deleteMeeting = catchAsync(async (req, res) => {
  await attendancesService.deleteMeeting(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Meeting deleted successfully',
  });
});

module.exports = {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  upsertMeetingAttendance,
  deleteMeeting,
};
