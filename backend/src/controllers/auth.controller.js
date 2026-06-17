const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');

exports.login = catchAsync(async (req, res) => {
  const data = await authService.login(req.body);
  res.status(200).json({
    success: true,
    ...data,
  });
});

exports.refreshToken = catchAsync(async (req, res) => {
  const { accessToken } = await authService.refreshAccessToken(req.body.refreshToken);
  res.status(200).json({
    success: true,
    accessToken,
  });
});

exports.logout = catchAsync(async (req, res) => {
  await authService.logout({
    userId: req.userId,
    refreshToken: req.body?.refreshToken,
  });
  res.status(200).json({
    success: true,
    message: '退出登录成功',
  });
});
