const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

// =========================
// 安全中间件
// =========================

// Helmet: 设置安全的HTTP头
app.use(helmet({
  contentSecurityPolicy: false, // 如果使用CDN资源，可能需要配置或禁用
  crossOriginEmbedderPolicy: false,
}));

// CORS配置：生产环境应该限制具体域名
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 请求速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP 100次请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 登录接口特殊限制（更严格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 15分钟内最多5次登录尝试
  message: '登录尝试次数过多，请15分钟后再试',
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);

// 防止HTTP参数污染
app.use(hpp());

// =========================
// 请求解析中间件
// =========================

// Parse requests of content-type - application/json
app.use(express.json({ limit: '10mb' }));

// Parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 配置静态文件服务，指向项目根目录下的 uploads 目录
const { applyUploadsStaticHeaders } = require('./utils/fileUploadPolicy');
const uploadsDir = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: applyUploadsStaticHeaders,
}));

// =========================
// API 路由
// =========================

// 健康检查接口（不需要认证）
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the backend server.' });
});

const { registerRoutes } = require('./routes/index');
registerRoutes(app);

// =========================
// 错误处理中间件（必须放在所有路由之后）
// =========================

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

module.exports = app; 