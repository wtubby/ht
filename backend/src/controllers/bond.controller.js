const catchAsync = require('../utils/catchAsync');
const bondService = require('../services/bond.service');

exports.create = catchAsync(async (req, res) => {
  const { bond, warnings } = await bondService.createBond(req.body, req.userId);
  res.status(201).json({
    success: true,
    data: bond,
    warnings,
    message: '担保创建成功',
  });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await bondService.findAllBonds(req.query);
  res.json({ success: true, data, total });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const subContracts = await bondService.getBondSelectOptions(req.query);
  res.json({ success: true, data: { subContracts } });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await bondService.findOneBond(req.params.id);
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const { bond, warnings } = await bondService.updateBond(req.params.id, req.body, req.userId);
  res.json({
    success: true,
    data: bond,
    warnings,
    message: '担保更新成功',
  });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await bondService.removeBond(req.params.id);
  res.json({
    success: true,
    message: '担保删除成功',
    data: { deletedFilesCount },
  });
});

exports.refund = catchAsync(async (req, res) => {
  const { bond } = await bondService.refundBond(req.params.id, req.body, req.userId);
  res.json({
    success: true,
    data: bond,
    message: '保证金退还成功',
  });
});
