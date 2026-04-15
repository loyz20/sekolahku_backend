const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const academicYearsService = require('./academic-years.service');

const getAcademicYears = catchAsync(async (req, res) => {
  const page   = Math.max(parseInt(req.query.page,  10) || 1,   1);
  const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';

  const result = await academicYearsService.getAcademicYears({ page, limit, search });

  sendResponse(res, {
    message: 'Academic years fetched successfully',
    data: result.academic_years,
    meta: result.meta,
  });
});

const getAcademicYearById = catchAsync(async (req, res) => {
  const ay = await academicYearsService.getAcademicYearById(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Academic year fetched successfully', data: ay });
});

const createAcademicYear = catchAsync(async (req, res) => {
  const { code, name, start_date, end_date, semester } = req.body;

  const ay = await academicYearsService.createAcademicYear({ code, name, start_date, end_date, semester });

  sendResponse(res, { statusCode: 201, message: 'Academic year created successfully', data: ay });
});

const updateAcademicYear = catchAsync(async (req, res) => {
  const { code, name, start_date, end_date, semester } = req.body;

  const ay = await academicYearsService.updateAcademicYear(parseInt(req.params.id, 10), {
    code,
    name,
    start_date,
    end_date,
    semester,
  });

  sendResponse(res, { message: 'Academic year updated successfully', data: ay });
});

const activateAcademicYear = catchAsync(async (req, res) => {
  const ay = await academicYearsService.activateAcademicYear(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Academic year activated successfully', data: ay });
});

const deleteAcademicYear = catchAsync(async (req, res) => {
  await academicYearsService.deleteAcademicYear(parseInt(req.params.id, 10));

  sendResponse(res, { message: 'Academic year deleted successfully' });
});

module.exports = {
  getAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  deleteAcademicYear,
};
