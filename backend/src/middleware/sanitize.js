/**
 * 输入清理中间件 - 防止 NoSQL 注入
 * 兼容 Express 5.x
 */

/**
 * 递归清理对象中的危险字符
 * @param {*} obj - 要清理的对象
 * @returns {*} - 清理后的对象
 */
const sanitizeValue = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理字符串
  if (typeof obj === 'string') {
    // 移除 MongoDB 操作符（如 $gt, $ne, $regex 等）
    return obj.replace(/^\$/, '');
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(sanitizeValue);
  }

  // 处理对象
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // 移除以 $ 开头的键（MongoDB 操作符）
        const sanitizedKey = key.replace(/^\$/, '');
        sanitized[sanitizedKey] = sanitizeValue(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Express 中间件函数
 */
const sanitize = (req, res, next) => {
  try {
    // 清理 req.body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }

    // 清理 req.params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }

    // 对于 req.query，只在有危险字符时才处理
    if (req.query && typeof req.query === 'object') {
      const hasNoSqlInjection = JSON.stringify(req.query).includes('$');
      if (hasNoSqlInjection) {
        const sanitizedQuery = sanitizeValue(req.query);
        // 在 Express 5.x 中使用 Object.defineProperty 替换
        Object.defineProperty(req, 'query', {
          value: sanitizedQuery,
          writable: false,
          configurable: true,
        });
      }
    }

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    // 清理失败不应该阻塞请求，记录日志并继续
    next();
  }
};

module.exports = sanitize;
