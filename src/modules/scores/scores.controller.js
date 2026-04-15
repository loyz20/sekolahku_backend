const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const scoresService = require('./scores.service');

const getScores = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const studentId = req.query.student_id || '';
  const subjectId = req.query.subject_id || '';
  const assessmentId = req.query.assessment_id || '';
  const academicYearId = req.query.academic_year_id || '';

  const result = await scoresService.getScores({
    page,
    limit,
    studentId,
    subjectId,
    assessmentId,
    academicYearId,
    actor: req.user,
  });

  sendResponse(res, {
    message: 'Scores fetched successfully',
    data: result.scores,
    meta: result.meta,
  });
});

const getScoreById = catchAsync(async (req, res) => {
  const score = await scoresService.getScoreById(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Score fetched successfully',
    data: score,
  });
});

const createScore = catchAsync(async (req, res) => {
  const { student_id, subject_id, assessment_id, academic_year_id, nilai } = req.body;

  const score = await scoresService.createScore({
    student_id,
    subject_id,
    assessment_id,
    academic_year_id,
    nilai,
  }, req.user);

  sendResponse(res, {
    statusCode: 201,
    message: 'Score created successfully',
    data: score,
  });
});

const updateScore = catchAsync(async (req, res) => {
  const { nilai } = req.body;

  const score = await scoresService.updateScore(parseInt(req.params.id, 10), { nilai }, req.user);

  sendResponse(res, {
    message: 'Score updated successfully',
    data: score,
  });
});

const deleteScore = catchAsync(async (req, res) => {
  await scoresService.deleteScore(parseInt(req.params.id, 10), req.user);

  sendResponse(res, {
    message: 'Score deleted successfully',
  });
});

module.exports = {
  getScores,
  getScoreById,
  createScore,
  updateScore,
  deleteScore,
};
