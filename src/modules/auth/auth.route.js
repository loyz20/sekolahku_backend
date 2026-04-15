const express = require('express');
const { register, login } = require('./auth.controller');
const { registerValidation, loginValidation } = require('./auth.validation');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
	res.status(200).json({
		success: true,
		message: 'Admin access granted',
	});
});

module.exports = router;
