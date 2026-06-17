const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

exports.create = catchAsync(async (req, res) => {
  const createdPayment = await paymentService.createPayment(req.body, req.userId);
  res.status(201).json({ success: true, data: createdPayment, message: '创建付款成功' });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await paymentService.findAllPayments(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await paymentService.findOnePayment(req.params.id);
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const data = await paymentService.updatePayment(req.params.id, req.body, req.userId);
  res.json({ success: true, data, message: '更新付款成功' });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await paymentService.removePayment(req.params.id);
  res.json({
    success: true,
    message: '付款删除成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const subContracts = await paymentService.getPaymentSelectOptions();
  res.json({ success: true, data: { subContracts } });
});
