const catchAsync = require('../utils/catchAsync');
const invoiceInService = require('../services/invoiceIn.service');

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await invoiceInService.findAllInvoiceIn(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await invoiceInService.findOneInvoiceIn(req.params.id);
  res.json({ success: true, data });
});

exports.create = catchAsync(async (req, res) => {
  const invoiceIn = await invoiceInService.createInvoiceIn(req.body, req.userId);
  res.status(201).json({
    success: true,
    data: invoiceIn,
    message: '创建进项发票成功',
  });
});

exports.update = catchAsync(async (req, res) => {
  const invoiceIn = await invoiceInService.updateInvoiceIn(req.params.id, req.body, req.userId);
  res.json({
    success: true,
    data: invoiceIn,
    message: '更新进项发票成功',
  });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await invoiceInService.removeInvoiceIn(req.params.id);
  res.json({
    success: true,
    message: '删除进项发票成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const subContracts = await invoiceInService.getInvoiceInSelectOptions(req.query);
  res.json({
    success: true,
    data: { subContracts },
  });
});
