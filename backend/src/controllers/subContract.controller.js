const catchAsync = require('../utils/catchAsync');
const subContractService = require('../services/subContract.service');

exports.create = catchAsync(async (req, res) => {
  const createdContract = await subContractService.createSubContract(req.body, req.userId);
  res.status(201).json({ success: true, data: createdContract, message: '创建分包合同成功' });
});

exports.findAll = catchAsync(async (req, res) => {
  const { data, total } = await subContractService.findAllSubContracts(req.query);
  res.json({ success: true, data, total });
});

exports.findOne = catchAsync(async (req, res) => {
  const data = await subContractService.findOneSubContract(req.params.id);
  res.json({ success: true, data });
});

exports.update = catchAsync(async (req, res) => {
  const updatedContract = await subContractService.updateSubContract(
    req.params.id,
    req.body,
    req.userId,
  );
  res.json({ success: true, data: updatedContract, message: '更新分包合同成功' });
});

exports.remove = catchAsync(async (req, res) => {
  const { deletedFilesCount } = await subContractService.removeSubContract(req.params.id);
  res.json({
    success: true,
    message: '分包合同删除成功',
    data: { deletedFilesCount },
  });
});

exports.getSelectOptions = catchAsync(async (req, res) => {
  const data = await subContractService.getSubContractSelectOptions();
  res.json({ success: true, data });
});
