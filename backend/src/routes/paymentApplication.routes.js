const express = require('express');
const validate = require('../middleware/validate');
const { paymentIdParam } = require('../validations/common');
const paymentApplicationController = require('../controllers/paymentApplication.controller');
const authJwt = require('../middleware/authJwt');

const router = express.Router();

router.get(
  '/:paymentId',
  [authJwt.verifyToken, validate(paymentIdParam)],
  paymentApplicationController.getApplicationData,
);

module.exports = router;
