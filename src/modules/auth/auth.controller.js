const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const authService = require('./auth.service');

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);

  sendResponse(res, {
    message: 'Login successful',
    data: result,
  });
});

module.exports = { register, login };
