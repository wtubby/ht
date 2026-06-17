/**
 * 异步控制器错误捕获包装器
 * 自动捕获异步错误并传递给全局 errorHandler
 * 避免每个控制器都写 try/catch + next(error)
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // 如果事务未提交，尝试回滚
    if (err.transaction && !err.transaction.finished) {
      err.transaction.rollback().catch(() => {});
    }
    next(err);
  });
};

module.exports = catchAsync;
