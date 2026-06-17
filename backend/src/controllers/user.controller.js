const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');

exports.getCurrentUser = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.userId);
  res.status(200).json({ success: true, data: user });
});

exports.updatePassword = catchAsync(async (req, res) => {
  await authService.updatePassword(req.userId, req.body);
  res.status(200).json({ success: true, message: '密码修改成功' });
});
