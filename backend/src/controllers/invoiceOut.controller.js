const catchAsync = require('../utils/catchAsync');
const invoiceOutService = require('../services/invoiceOut.service');

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await invoiceOutService.findAllInvoiceOut(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await invoiceOutService.findOneInvoiceOut(req.params.id);
  res.json({ success: true, data });
});

exports.create = catchAsync(async (req, res) => {
  const invoiceOut = await invoiceOutService.createInvoiceOut(req.body, req.userId);
  res.status(201).json({
    success: true,
    data: invoiceOut,
    message: '创建销项发票成功',
  });
});

exports.update = catchAsync(async (req, res) => {
  const invoiceOut = await invoiceOutService.updateInvoiceOut(req.params.id, req.body, req.userId);
  res.json({
    success: true,
    data: invoiceOut,
    message: '更新销项发票成功',
  });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await invoiceOutService.removeInvoiceOut(req.params.id);
  res.json({
    success: true,
    message: '删除销项发票成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const mainContracts = await invoiceOutService.getInvoiceOutSelectOptions(req.query);
  res.json({
    success: true,
    data: { mainContracts },
  });
});
