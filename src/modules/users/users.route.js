const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const usersController = require('./users.controller');
const {
  getUsersValidation,
  userIdParamValidation,
  updateUserValidation,
  updateMeValidation,
  changePasswordValidation,
  changeMyPasswordValidation,
} = require('./users.validation');

const router = express.Router();

// All routes require a valid JWT.
router.use(authenticate);

// ─── Own Profile ──────────────────────────────────────────────────────────────
router.get('/me', usersController.getMe);
router.patch('/me', validate(updateMeValidation), usersController.updateMe);
router.patch('/me/password', validate(changeMyPasswordValidation), usersController.changeMyPassword);

// ─── Admin / Kepala Sekolah routes ────────────────────────────────────────────
router.get('/', authorize('admin', 'kepala_sekolah', 'superadmin'), validate(getUsersValidation), usersController.getUsers);
router.get('/:id', authorize('admin', 'kepala_sekolah', 'superadmin'), validate(userIdParamValidation), usersController.getUserById);
router.patch('/:id', authorize('admin', 'superadmin'), validate(updateUserValidation), usersController.updateUser);
router.patch('/:id/password', authorize('admin', 'superadmin'), validate(changePasswordValidation), usersController.changePassword);
router.patch('/:id/status', authorize('admin', 'superadmin'), validate(userIdParamValidation), usersController.toggleStatus);
router.delete('/:id', authorize('superadmin'), validate(userIdParamValidation), usersController.deleteUser);

module.exports = router;
