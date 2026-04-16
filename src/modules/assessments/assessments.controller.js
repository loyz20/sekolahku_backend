const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const assessmentsService = require('./assessments.service');

const getAssessments = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const namaPenilaian = req.query.nama_penilaian || '';
  const teacherId = req.query.teacher_id || '';
  const academicYearId = req.query.academic_year_id || req.context?.academicYearId || '';
  const isActive = req.query.is_active === undefined
    ? undefined
    : req.query.is_active === 'true' || req.query.is_active === true || req.query.is_active === 1;

  const result = await assessmentsService.getAssessments({
    page,
    limit,
    search,
    namaPenilaian,
    teacherId,
    academicYearId,
    isActive,
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Assessments fetched successfully',
    data: result.assessments,
    meta: result.meta,
  });
});

const getAssessmentById = catchAsync(async (req, res) => {
  const assessment = await assessmentsService.getAssessmentById(
    parseInt(req.params.id, 10),
    req.user,
    req.context?.academicYearId || req.query.academic_year_id
  );

  sendResponse(res, {
    message: 'Assessment fetched successfully',
    data: assessment,
  });
});

const createAssessment = catchAsync(async (req, res) => {
  const { nama_penilaian, bobot, description, teacher_id, academic_year_id } = req.body;

  const assessment = await assessmentsService.createAssessment({
    nama_penilaian,
    bobot,
    description,
    teacher_id,
    academic_year_id,
  }, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Assessment created successfully',
    data: assessment,
  });
});

const updateAssessment = catchAsync(async (req, res) => {
  const { nama_penilaian, bobot, description, is_active } = req.body;

  const assessment = await assessmentsService.updateAssessment(
    parseInt(req.params.id, 10),
    {
      nama_penilaian,
      bobot,
      description,
      is_active,
    },
    req.user,
    req.context?.academicYearId || req.query.academic_year_id
  );

  sendResponse(res, {
    message: 'Assessment updated successfully',
    data: assessment,
  });
});

const deleteAssessment = catchAsync(async (req, res) => {
  await assessmentsService.deleteAssessment(
    parseInt(req.params.id, 10),
    req.user,
    req.context?.academicYearId || req.query.academic_year_id
  );

  sendResponse(res, {
    message: 'Assessment deleted successfully',
  });
});

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
};
