const catchAsync = require('../utils/catchAsync');
const systemSettingsService = require('../services/systemSettings.service');

exports.getPublic = catchAsync(async (req, res) => {
  const data = await systemSettingsService.getPublicSettings();
  res.json({ success: true, data });
});

exports.getDetail = catchAsync(async (req, res) => {
  const data = await systemSettingsService.getSystemSettings();
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const data = await systemSettingsService.updateSystemSettings(req.body, req.userId);
  res.json({ success: true, data, message: '系统设置更新成功' });
});
