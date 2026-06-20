const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middleware/authJwt');

// 应用认证中间件
router.use(verifyToken);

// 获取仪表盘统计数据
router.get('/statistics', dashboardController.getStatistics);

// 获取趋势数据
router.get('/trend', dashboardController.getTrendData);

// 获取项目收款进度
router.get('/project-receive-progress', dashboardController.getProjectReceiveProgress);

// 到期预警
router.get('/upcoming-expirations', dashboardController.getUpcomingExpirations);

module.exports = router;
