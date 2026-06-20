const catchAsync = require('../utils/catchAsync');
const dashboardService = require('../services/dashboard.service');

exports.getStatistics = catchAsync(async (req, res) => {
  const data = await dashboardService.getStatistics(req.query);
  res.json({ success: true, data });
});

exports.getProjectReceiveProgress = catchAsync(async (req, res) => {
  const data = await dashboardService.getProjectReceiveProgress(req.query);
  res.json({ success: true, data });
});

exports.getTrendData = catchAsync(async (req, res) => {
  const data = await dashboardService.getTrendData(req.query);
  res.json({ success: true, data });
});

exports.getUpcomingExpirations = catchAsync(async (req, res) => {
  const data = await dashboardService.getUpcomingExpirations(req.query);
  res.json({ success: true, data });
});
