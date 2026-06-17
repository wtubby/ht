const catchAsync = require('../utils/catchAsync');
const bankAccountService = require('../services/bankAccount.service');

exports.create = catchAsync(async (req, res) => {
  const createdAccount = await bankAccountService.createBankAccount(
    req.body,
    req.userId,
    req.params.companyId,
  );
  res.status(201).json({ success: true, data: createdAccount, message: '创建银行账号成功' });
});

exports.update = catchAsync(async (req, res) => {
  const updatedAccount = await bankAccountService.updateBankAccount(req.params.id, req.body, req.userId);
  res.json({ success: true, data: updatedAccount, message: '更新银行账号成功' });
});

exports.remove = catchAsync(async (req, res) => {
  await bankAccountService.removeBankAccount(req.params.id);
  res.json({ success: true, message: '银行账户删除成功' });
});

exports.findAllByCompany = catchAsync(async (req, res) => {
  const accounts = await bankAccountService.findBankAccountsByCompany(req.params.companyId);
  res.json({ success: true, data: accounts });
});

exports.setDefault = catchAsync(async (req, res) => {
  const updatedAccount = await bankAccountService.setDefaultBankAccount(req.params.id, req.userId);
  res.json({ success: true, data: updatedAccount });
});
