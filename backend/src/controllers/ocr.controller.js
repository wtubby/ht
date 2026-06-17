const catchAsync = require('../utils/catchAsync');
const ocrService = require('../services/ocr.service');

exports.recognize = catchAsync(async (req, res) => {
  const invoiceData = await ocrService.recognizeInvoiceFromPath(req.body.filePath);

  res.json({
    success: true,
    data: invoiceData,
    message: 'OCR识别成功',
  });
});
