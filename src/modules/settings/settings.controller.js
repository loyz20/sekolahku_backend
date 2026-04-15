const catchAsync = require('../../utils/catchAsync');
const { sendResponse } = require('../../utils/response');
const settingsService = require('./settings.service');

const getAllSettings = catchAsync(async (req, res) => {
  const group = req.query.group || '';
  const settings = await settingsService.getAllSettings(group);

  sendResponse(res, { message: 'Settings fetched successfully', data: settings });
});

const getPublicSettings = catchAsync(async (req, res) => {
  const group = req.query.group || '';
  const settings = await settingsService.getPublicSettings(group);

  sendResponse(res, { message: 'Public settings fetched successfully', data: settings });
});

const updateSettings = catchAsync(async (req, res) => {
  const updates = req.body.settings;
  const updated = await settingsService.updateSettings(updates);

  sendResponse(res, { message: 'Settings updated successfully', data: updated });
});

module.exports = { getAllSettings, getPublicSettings, updateSettings };
