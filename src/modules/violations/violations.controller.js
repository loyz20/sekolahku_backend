const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const violationsService = require('./violations.service');

const getViolationTypes = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const result = await violationsService.getViolationTypes({
    page,
    limit,
    search: req.query.search || '',
    isActive: typeof req.query.is_active === 'undefined' ? undefined : req.query.is_active,
    severity: req.query.severity || '',
  });

  sendResponse(res, {
    message: 'Violation types fetched successfully',
    data: result.types,
    meta: result.meta,
  });
});

const getViolationTypeById = catchAsync(async (req, res) => {
  const item = await violationsService.getViolationTypeById(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Violation type fetched successfully',
    data: item,
  });
});

const createViolationType = catchAsync(async (req, res) => {
  const item = await violationsService.createViolationType(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'Violation type created successfully',
    data: item,
  });
});

const updateViolationType = catchAsync(async (req, res) => {
  const item = await violationsService.updateViolationType(parseInt(req.params.id, 10), req.body);

  sendResponse(res, {
    message: 'Violation type updated successfully',
    data: item,
  });
});

const deleteViolationType = catchAsync(async (req, res) => {
  await violationsService.deleteViolationType(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Violation type deleted successfully',
  });
});

const getViolations = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const result = await violationsService.getViolations({
    page,
    limit,
    search: req.query.search || '',
    studentId: req.query.student_id || '',
    classId: req.query.class_id || '',
    academicYearId: req.query.academic_year_id || '',
    violationTypeId: req.query.violation_type_id || '',
    severity: req.query.severity || '',
    dateFrom: req.query.date_from || '',
    dateTo: req.query.date_to || '',
  });

  sendResponse(res, {
    message: 'Violations fetched successfully',
    data: result.violations,
    meta: result.meta,
  });
});

const getViolationStudents = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const result = await violationsService.getViolationStudents({
    page,
    limit,
    search: req.query.search || '',
    classId: req.query.class_id || '',
    academicYearId: req.query.academic_year_id || '',
    violationTypeId: req.query.violation_type_id || '',
    severity: req.query.severity || '',
    dateFrom: req.query.date_from || '',
    dateTo: req.query.date_to || '',
  });

  sendResponse(res, {
    message: 'Violation students fetched successfully',
    data: result.students,
    meta: result.meta,
  });
});

const getViolationById = catchAsync(async (req, res) => {
  const item = await violationsService.getViolationById(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Violation fetched successfully',
    data: item,
  });
});

const createViolation = catchAsync(async (req, res) => {
  const item = await violationsService.createViolation(req.body, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Violation created successfully',
    data: item,
  });
});

const createBulkViolation = catchAsync(async (req, res) => {
  const items = await violationsService.createViolations(req.body, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Violations created successfully',
    data: items,
  });
});

const updateViolation = catchAsync(async (req, res) => {
  const item = await violationsService.updateViolation(parseInt(req.params.id, 10), req.body, req.user);

  sendResponse(res, {
    message: 'Violation updated successfully',
    data: item,
  });
});

const deleteViolation = catchAsync(async (req, res) => {
  await violationsService.deleteViolation(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'Violation deleted successfully',
  });
});

const getViolationSummary = catchAsync(async (req, res) => {
  const summary = await violationsService.getViolationSummary({
    classId: req.query.class_id || '',
    academicYearId: req.query.academic_year_id || '',
    violationTypeId: req.query.violation_type_id || '',
    severity: req.query.severity || '',
    dateFrom: req.query.date_from || '',
    dateTo: req.query.date_to || '',
  });

  sendResponse(res, {
    message: 'Violation summary fetched successfully',
    data: summary,
  });
});

module.exports = {
  getViolationTypes,
  getViolationTypeById,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  getViolations,
  getViolationStudents,
  getViolationById,
  createViolation,
  createBulkViolation,
  updateViolation,
  deleteViolation,
  getViolationSummary,
};
