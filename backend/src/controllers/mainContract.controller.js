const catchAsync = require('../utils/catchAsync');
const mainContractService = require('../services/mainContract.service');
const mainContractRelatedService = require('../services/mainContractRelated.service');

exports.create = catchAsync(async (req, res) => {
  const createdContract = await mainContractService.createMainContract(req.body, req.userId);
  res.status(201).json({
    success: true,
    data: createdContract,
    message: '创建总包合同成功',
  });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await mainContractService.findAllMainContracts(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await mainContractService.findOneMainContract(req.params.id);
  res.json({ success: true, data });
});

exports.findRelated = catchAsync(async (req, res) => {
  const data = await mainContractRelatedService.findMainContractRelated(req.params.id);
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const updatedContract = await mainContractService.updateMainContract(
    req.params.id,
    req.body,
    req.userId,
  );
  res.json({ success: true, data: updatedContract, message: '更新总包合同成功' });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await mainContractService.removeMainContract(req.params.id);
  res.json({
    success: true,
    message: '总包合同删除成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const data = await mainContractService.getMainContractSelectOptions();
  res.json({ success: true, data });
});
