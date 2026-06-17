const catchAsync = require('../utils/catchAsync');
const fileService = require('../services/file.service');

exports.findAll = catchAsync(async (req, res) => {
  const result = await fileService.findAll(req.query);
  res.json({ success: true, ...result });
});

exports.uploadDirect = catchAsync(async (req, res) => {
  const fileRecord = await fileService.uploadDirect({
    file: req.file,
    body: req.body,
    userId: req.userId,
  });
  res.status(201).json({
    success: true,
    data: fileRecord,
    message: '文件上传成功',
  });
});

exports.remove = catchAsync(async (req, res) => {
  await fileService.remove(req.params.id);
  res.json({ success: true, message: '文件删除成功' });
});

exports.rename = catchAsync(async (req, res) => {
  const { fileRecord, message } = await fileService.renameInvoiceFile(
    req.params.id,
    req.userId,
    req.body,
  );
  res.json({ success: true, data: fileRecord, message });
});

exports.getModuleConfigs = (req, res) => {
  res.json({ success: true, data: fileService.getModuleConfigs() });
};
