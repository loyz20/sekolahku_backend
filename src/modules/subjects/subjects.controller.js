const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const subjectsService = require('./subjects.service');

const getSubjects = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';

  const result = await subjectsService.getSubjects({ page, limit, search });

  sendResponse(res, {
    message: 'Subjects fetched successfully',
    data: result.subjects,
    meta: result.meta,
  });
});

const getSubjectById = catchAsync(async (req, res) => {
  const subject = await subjectsService.getSubjectById(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Subject fetched successfully',
    data: subject,
  });
});

const createSubject = catchAsync(async (req, res) => {
  const { code, name, description } = req.body;

  const subject = await subjectsService.createSubject({ code, name, description });

  sendResponse(res, {
    statusCode: 201,
    message: 'Subject created successfully',
    data: subject,
  });
});

const updateSubject = catchAsync(async (req, res) => {
  const { code, name, description } = req.body;

  const subject = await subjectsService.updateSubject(parseInt(req.params.id, 10), {
    code,
    name,
    description,
  });

  sendResponse(res, {
    message: 'Subject updated successfully',
    data: subject,
  });
});

const toggleSubjectStatus = catchAsync(async (req, res) => {
  const result = await subjectsService.toggleSubjectStatus(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Subject status toggled successfully',
    data: result,
  });
});

const deleteSubject = catchAsync(async (req, res) => {
  await subjectsService.deleteSubject(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Subject deleted successfully' });
});

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
  deleteSubject,
};
