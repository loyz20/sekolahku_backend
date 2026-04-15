const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const usersService = require('./users.service');

const getUsers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const search = req.query.search || '';
  const duty = req.query.duty || '';

  const result = await usersService.getUsers({
    page,
    limit,
    search,
    dutyCode: duty,
  });

  sendResponse(res, {
    message: 'Users fetched successfully',
    data: result.users,
    meta: result.meta,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(parseInt(req.params.id, 10));

  sendResponse(res, {
    message: 'User fetched successfully',
    data: user,
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.user.id);

  sendResponse(res, {
    message: 'Profile fetched successfully',
    data: user,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { name, nip, email } = req.body;

  const user = await usersService.updateUser(targetId, { name, nip, email });

  sendResponse(res, {
    message: 'User updated successfully',
    data: user,
  });
});

const updateMe = catchAsync(async (req, res) => {
  const { name, nip, email } = req.body;

  const user = await usersService.updateUser(req.user.id, { name, nip, email });

  sendResponse(res, {
    message: 'Profile updated successfully',
    data: user,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  await usersService.changePassword(
    targetId,
    { currentPassword: req.body.currentPassword, newPassword: req.body.newPassword },
    req.user.id
  );

  sendResponse(res, { message: 'Password changed successfully' });
});

const changeMyPassword = catchAsync(async (req, res) => {
  await usersService.changePassword(
    req.user.id,
    { currentPassword: req.body.currentPassword, newPassword: req.body.newPassword },
    req.user.id
  );

  sendResponse(res, { message: 'Password changed successfully' });
});

const toggleStatus = catchAsync(async (req, res) => {
  const result = await usersService.toggleStatus(
    parseInt(req.params.id, 10),
    req.user.id
  );

  sendResponse(res, {
    message: `User ${result.is_active ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await usersService.deleteUser(parseInt(req.params.id, 10), req.user.id);

  sendResponse(res, { message: 'User deleted successfully' });
});

module.exports = {
  getUsers,
  getUserById,
  getMe,
  updateUser,
  updateMe,
  changePassword,
  changeMyPassword,
  toggleStatus,
  deleteUser,
};
