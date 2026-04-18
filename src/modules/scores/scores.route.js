const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const scoresController = require('./scores.controller');
const {
  getScoresValidation,
  scoreIdParamValidation,
  createScoreValidation,
  updateScoreValidation,
} = require('./scores.validation');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(getScoresValidation),
  scoresController.getScores
);

router.post(
  '/',
  authorize('admin', 'guru', 'superadmin'),
  validate(createScoreValidation),
  scoresController.createScore
);

router.get(
  '/:id',
  authorize('admin', 'guru', 'kepala_sekolah', 'superadmin'),
  validate(scoreIdParamValidation),
  scoresController.getScoreById
);

router.patch(
  '/:id',
  authorize('admin', 'guru', 'superadmin'),
  validate(updateScoreValidation),
  scoresController.updateScore
);

router.delete(
  '/:id',
  authorize('admin', 'superadmin'),
  validate(scoreIdParamValidation),
  scoresController.deleteScore
);

module.exports = router;
