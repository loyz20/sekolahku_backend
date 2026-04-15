const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const dutyService = require('./duty.service');

const getDuties = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await dutyService.getDuties({ page: Number(page), limit: Number(limit) });

  sendResponse(res, {
    message: 'Duties retrieved successfully',
    data: result.duties,
    meta: result.meta,
  });
});

const assignDuty = catchAsync(async (req, res) => {
  const result = await dutyService.assignDuty({
    targetUserId: req.body.userId,
    dutyCode: req.body.dutyCode,
    actorUserId: req.user.id,
    notes: req.body.notes,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Duty assigned successfully',
    data: result,
  });
});

const revokeDuty = catchAsync(async (req, res) => {
  const result = await dutyService.revokeDuty({
    targetUserId: req.body.userId,
    dutyCode: req.body.dutyCode,
    actorUserId: req.user.id,
    notes: req.body.notes,
  });

  sendResponse(res, {
    message: 'Duty revoked successfully',
    data: result,
  });
});

const assignHomeroom = catchAsync(async (req, res) => {
  const result = await dutyService.assignHomeroom({
    targetUserId: req.body.userId,
    classId: req.body.classId,
    academicYearId: req.body.academicYearId,
    actorUserId: req.user.id,
    notes: req.body.notes,
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Homeroom assigned successfully',
    data: result,
  });
});

const revokeHomeroom = catchAsync(async (req, res) => {
  const result = await dutyService.revokeHomeroom({
    classId: req.body.classId,
    academicYearId: req.body.academicYearId,
    actorUserId: req.user.id,
    notes: req.body.notes,
  });

  sendResponse(res, {
    message: 'Homeroom assignment revoked successfully',
    data: result,
  });
});

const getUserActiveAssignments = catchAsync(async (req, res) => {
  const result = await dutyService.getUserActiveAssignments(req.params.userId);

  sendResponse(res, {
    message: 'Active assignments fetched successfully',
    data: result,
  });
});

module.exports = {
  getDuties,
  assignDuty,
  revokeDuty,
  assignHomeroom,
  revokeHomeroom,
  getUserActiveAssignments,
};
