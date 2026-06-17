const catchAsync = require('../utils/catchAsync');
const companyService = require('../services/company.service');

exports.create = catchAsync(async (req, res) => {
  const company = await companyService.createCompany(req.body, req.userId);
  res.status(201).json({ success: true, data: company, message: '创建单位成功' });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await companyService.findAllCompanies(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const company = await companyService.findOneCompany(req.params.id);
  res.json({ success: true, data: company });
});

exports.update = catchAsync(async (req, res) => {
  const updatedCompany = await companyService.updateCompany(req.params.id, req.body, req.userId);
  res.json({ success: true, data: updatedCompany, message: '更新单位成功' });
});

exports.remove = catchAsync(async (req, res) => {
  await companyService.removeCompany(req.params.id);
  res.json({ success: true, message: '单位删除成功' });
});
