const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errorCode } = err;

  // 如果不是 ApiError，转换为标准错误
  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = err.message || 'Internal Server Error';
    errorCode = ERROR_CODES.INTERNAL_ERROR;
  }

  // 开发环境返回堆栈信息，生产环境隐藏
  const response = {
    success: false,
    message,
    errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // 记录错误日志
  if (statusCode >= 500) {
    console.error('[Error]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message,
      stack: err.stack,
    });
  } else {
    console.warn('[Warning]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message,
    });
  }

  res.status(statusCode).json(response);
};

/**
 * 404 错误处理
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`, ERROR_CODES.RESOURCE_NOT_FOUND);
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
