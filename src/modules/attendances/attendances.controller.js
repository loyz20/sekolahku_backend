const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const attendancesService = require('./attendances.service');

const getAttendances = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const result = await attendancesService.getAttendances({
    page,
    limit,
    studentId: req.query.student_id || '',
    subjectId: req.query.subject_id || '',
    dateFrom: req.query.date_from || '',
    dateTo: req.query.date_to || '',
    status: req.query.status || '',
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Attendances fetched successfully',
    data: result.attendances,
    meta: result.meta,
  });
});

const getAttendanceById = catchAsync(async (req, res) => {
  const attendance = await attendancesService.getAttendanceById(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Attendance fetched successfully',
    data: attendance,
  });
});

const createAttendance = catchAsync(async (req, res) => {
  const attendance = await attendancesService.createAttendance(req.body, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Attendance created successfully',
    data: attendance,
  });
});

const bulkUpsertAttendances = catchAsync(async (req, res) => {
  const result = await attendancesService.bulkUpsertAttendances(req.body, req.user);

  sendResponse(res, {
    message: 'Attendances upserted successfully',
    data: result,
  });
});

const updateAttendance = catchAsync(async (req, res) => {
  const attendance = await attendancesService.updateAttendance(parseInt(req.params.id, 10), req.body, req.user);

  sendResponse(res, {
    message: 'Attendance updated successfully',
    data: attendance,
  });
});

const deleteAttendance = catchAsync(async (req, res) => {
  await attendancesService.deleteAttendance(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Attendance deleted successfully',
  });
});

const getAttendanceSummary = catchAsync(async (req, res) => {
  const summary = await attendancesService.getAttendanceSummary({
    subjectId: req.query.subject_id || '',
    studentId: req.query.student_id || '',
    dateFrom: req.query.date_from || '',
    dateTo: req.query.date_to || '',
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Attendance summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  getAttendances,
  getAttendanceById,
  createAttendance,
  bulkUpsertAttendances,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
};
