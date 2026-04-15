const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const settingsController = require('./settings.controller');
const { getSettingsValidation, updateSettingsValidation } = require('./settings.validation');

const router = express.Router();

// Public — no auth required. Available to everyone (e.g. frontend branding before login).
router.get('/public', validate(getSettingsValidation), settingsController.getPublicSettings);

// Protected routes.
router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'kepala_sekolah', 'superadmin'),
  validate(getSettingsValidation),
  settingsController.getAllSettings
);

router.patch(
  '/',
  authorize('admin', 'superadmin'),
  validate(updateSettingsValidation),
  settingsController.updateSettings
);

module.exports = router;
