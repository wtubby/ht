const catchAsync = require('../utils/catchAsync');
const paymentApplicationService = require('../services/paymentApplication.service');

exports.getApplicationData = catchAsync(async (req, res) => {
  const applicationData = await paymentApplicationService.getApplicationData(req.params.paymentId);
  res.json({ success: true, data: applicationData });
});
