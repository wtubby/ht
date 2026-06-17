/**
 * 统一注册 API 路由
 * @param {import('express').Application} app
 */
function registerRoutes(app) {
  app.use('/api/auth', require('./auth.routes'));
  app.use('/api/ocr', require('./ocr.routes'));
  app.use('/api/companies', require('./company.routes'));

  const bankAccountRoutes = require('./bankAccount.routes');
  app.use('/api/bank-accounts', bankAccountRoutes.bankAccountRouter);
  app.use('/api/companies/:companyId/bank-accounts', bankAccountRoutes.companyNestedRouter);

  app.use('/api/main-contracts', require('./mainContract.routes'));
  app.use('/api/files', require('./file.routes'));
  app.use('/api/sub-contracts', require('./subContract.routes'));
  app.use('/api/payments', require('./payment.routes'));
  app.use('/api/receives', require('./receive.routes'));
  app.use('/api/invoice-in', require('./invoiceIn.routes'));
  app.use('/api/invoice-out', require('./invoiceOut.routes'));
  app.use('/api/bonds', require('./bond.routes'));
  app.use('/api/payment-applications', require('./paymentApplication.routes'));
  app.use('/api/dashboard', require('./dashboard.routes'));
  app.use('/api/system-settings', require('./systemSettings.routes'));
}

module.exports = { registerRoutes };
