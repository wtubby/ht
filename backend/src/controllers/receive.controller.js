const catchAsync = require('../utils/catchAsync');
const receiveService = require('../services/receive.service');

exports.create = catchAsync(async (req, res) => {
  const createdReceive = await receiveService.createReceive(req.body, req.userId);
  res.status(201).json({ success: true, data: createdReceive, message: '创建收款成功' });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await receiveService.findAllReceives(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await receiveService.findOneReceive(req.params.id);
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const updatedReceive = await receiveService.updateReceive(req.params.id, req.body, req.userId);
  res.json({ success: true, data: updatedReceive, message: '更新收款成功' });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await receiveService.removeReceive(req.params.id);
  res.json({
    success: true,
    message: '收款删除成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const mainContracts = await receiveService.getReceiveSelectOptions();
  res.json({ success: true, data: { mainContracts } });
});
